# ===== IMPORTS AND SETUP =====
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, MODEL_CONFIG
from typing import Dict, List, Optional
import os
from audiocraft.models import MusicGen
from audiocraft.data.audio import audio_write
import time
from PIL import Image
import io
from transformers import CLIPProcessor, CLIPModel

# ===== IMAGE ANALYSIS SETUP =====
# Initialize CLIP model and processor
clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

async def analyze_image(image_data: bytes) -> str:
    """Analyze image using CLIP and return scene description"""
    try:
        # Process image
        image = Image.open(io.BytesIO(image_data))
        inputs = clip_processor(images=image, return_tensors="pt", padding=True)
        
        # Get image features
        image_features = clip_model.get_image_features(**inputs)
        
        # Get text description using CLIP's zero-shot classification
        candidate_labels = [
            "a peaceful landscape", "a busy city scene", "a dark and moody atmosphere",
            "a bright and cheerful setting", "a natural environment", "an urban setting",
            "a dramatic scene", "a calm and serene view", "a mysterious atmosphere",
            "a vibrant and energetic scene"
        ]
        
        # Process text labels
        text_inputs = clip_processor(candidate_labels, return_tensors="pt", padding=True)
        text_features = clip_model.get_text_features(**text_inputs)
        
        # Calculate similarity
        similarity = (100.0 * image_features @ text_features.T).softmax(dim=-1)
        
        # Get top 3 most relevant descriptions
        top_k = 3
        top_indices = similarity[0].topk(top_k).indices
        descriptions = [candidate_labels[idx] for idx in top_indices]
        
        return "A scene that appears to be " + ", ".join(descriptions)
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return ""

async def combine_scene_inputs(text: str, image_data: Optional[bytes] = None) -> str:
    """Combine text and image analysis into a single scene description"""
    if image_data:
        image_description = await analyze_image(image_data)
        if text:
            return f"{text} (Scene also contains: {image_description})"
        return image_description
    return text

app = FastAPI()
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# ===== CORS CONFIGURATION =====
# Enables frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== STATIC FILES SETUP =====
# Serves frontend files to browser
app.mount("/static", StaticFiles(directory="static"), name="static")

# ===== PROMPT TEMPLATES =====
SCENE_PROMPT_TEMPLATE = """Given the following scene description, create a musical and ambient soundscape that captures its essence. Focus on:
1. A short atmospheric narrative that emphasizes the mood and emotional tone
2. A list of key sound elements that would create a rich, layered ambient experience, including:
   - Musical elements (pads, drones, melodies, rhythms)
   - Environmental sounds
   - Textural elements
   - Mood-setting sounds
3. Suggested audio parameters for each element to create a cohesive mix

Scene: {scene}

Format your response as JSON with the following structure:
{{
    "narrative": "string (focus on the emotional and atmospheric qualities)",
    "sound_elements": [
        {{
            "name": "string",
            "description": "string (focus on musical and ambient qualities, e.g., 'A soft, ethereal pad that slowly evolves with gentle filter sweeps' or 'A deep, resonant drone that pulses subtly like distant thunder')",
            "parameters": {{
                "volume": "float between 0 and 1",
                "pan": "float between -1 and 1",
                "effects": ["list of suggested effects like reverb, delay, filter, etc."]
            }}
        }}
    ]
}}

Example sound elements:
- "A warm, evolving pad that slowly shifts between major and minor chords"
- "A gentle, filtered arpeggio that mimics the movement of leaves in the wind"
- "A deep, atmospheric drone that creates a sense of space and depth"
- "Subtle, processed field recordings that add texture and realism"
- "Ambient textures that blend organic and synthetic elements"
"""

# ===== SCENE GENERATION =====
async def generate_scene_chunks(scene: str):
    try:
        try:
            prompt = SCENE_PROMPT_TEMPLATE.format(scene=scene)
        except Exception as e:
            print("Exception during prompt formatting:", e)
            raise        
        stream = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            **MODEL_CONFIG
        )

        # Accumulate all content
        full_content = ""
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                full_content += chunk.choices[0].delta.content

        # Now yield the full content as a single chunk
        yield f"data: {json.dumps({'chunk': full_content})}\n\n"

    except Exception as e:
        error_message = f"Error: {str(e)}"
        print("Exception in generate_scene_chunks:", error_message)
        yield f"data: {json.dumps({'chunk': error_message})}\n\n"

# ===== SCENE GENERATION ENDPOINT =====
@app.post("/generate-scene")
async def generate_scene(
    request: Request,
    image: Optional[UploadFile] = File(None)
):
    form_data = await request.form()
    print("[DEBUG] form_data:", form_data)
    text_scene = form_data.get("text", "")
    print("[DEBUG] text_scene:", text_scene)

    image_data = None
    if image:
        image_data = await image.read()
        print("[DEBUG] image_data length:", len(image_data) if image_data else 0)

    combined_scene = await combine_scene_inputs(text_scene, image_data)
    print("[DEBUG] combined_scene:", combined_scene)

    # Generate the LLM response (not as a stream)
    prompt = SCENE_PROMPT_TEMPLATE.format(scene=combined_scene)
    print("[DEBUG] prompt:", prompt)
    response = await client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        **MODEL_CONFIG
    )
    # Accumulate all content
    full_content = ""
    async for chunk in response:
        if chunk.choices[0].delta.content:
            full_content += chunk.choices[0].delta.content
    print("[DEBUG] full_content:", full_content)

    # Parse the JSON from the LLM output
    try:
        result = json.loads(full_content)
    except Exception as e:
        print("[DEBUG] JSON parse error:", e)
        return {"error": f"Failed to parse LLM output: {e}", "raw": full_content}

    return result

AUDIO_OUTPUT_DIR = "static/audio"
os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)

# Load the AudioCraft model once at startup
musicgen = MusicGen.get_pretrained('facebook/musicgen-small')

async def generate_and_save_audio(element, musicgen, output_dir):
    prompt = element["description"]
    base_filename = element['name'].replace(' ', '_')
    filename = f"{base_filename}.wav"
    filepath = os.path.join(output_dir, base_filename)
    abs_filepath = os.path.abspath(filepath + '.wav')

    try:
        # Run blocking MusicGen and audio_write in a thread
        wav = await asyncio.to_thread(musicgen.generate, [prompt], progress=True)
        await asyncio.to_thread(audio_write, filepath, wav[0].cpu(), musicgen.sample_rate, strategy="loudness", loudness_compressor=True)
        if os.path.exists(abs_filepath) and os.path.getsize(abs_filepath) > 0:
            return f"/static/audio/{filename}"
    except Exception as e:
        print(f"Error during audio generation for {prompt}: {e}")
    return None

@app.post("/generate-audio")
async def generate_audio(request: Request):
    data = await request.json()
    sound_elements = data.get("sound_elements", [])[:2]  # Limit to first 4 elements
    audio_urls = []

    for element in sound_elements:
        prompt = element["description"]
        print("Generating audio for prompt:", prompt)
        
        try:
            # Generate audio (10 seconds, stereo, 32000 Hz)
            print("Starting audio generation...")
            audio_url = await generate_and_save_audio(element, musicgen, AUDIO_OUTPUT_DIR)
            print("Audio generation complete!")
            if audio_url:
                audio_urls.append(audio_url)
            else:
                print(f"Error: Audio generation failed for {prompt}")
            
        except Exception as e:
            print(f"Error during audio generation or file writing: {str(e)}")
            continue

    return {"audio_urls": audio_urls}

# ===== SERVER STARTUP =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

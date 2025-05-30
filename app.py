# ===== IMPORTS AND SETUP =====
from fastapi import FastAPI, Request
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
async def generate_scene(request: Request):
    data = await request.json()
    scene = data.get("scene", "")
    
    return StreamingResponse(
        generate_scene_chunks(scene),
        media_type="text/event-stream"
    )

AUDIO_OUTPUT_DIR = "static/audio"
os.makedirs(AUDIO_OUTPUT_DIR, exist_ok=True)

# Load the AudioCraft model once at startup
musicgen = MusicGen.get_pretrained('facebook/musicgen-small')

@app.post("/generate-audio")
async def generate_audio(request: Request):
    data = await request.json()
    sound_elements = data.get("sound_elements", [])[:4]  # Limit to first 4 elements
    audio_urls = []

    for element in sound_elements:
        prompt = element["description"]
        print("Generating audio for prompt:", prompt)
        
        try:
            # Generate audio (10 seconds, stereo, 32000 Hz)
            print("Starting audio generation...")
            wav = musicgen.generate([prompt], progress=True)
            print("Audio generation complete!")
            print("Generated wav shape:", wav[0].shape)
            print("Sample rate:", musicgen.sample_rate)
            
            # Remove .wav extension since audio_write will add it
            base_filename = element['name'].replace(' ', '_')
            filename = f"{base_filename}.wav"  # This is for the URL
            filepath = os.path.join(AUDIO_OUTPUT_DIR, base_filename)  # This is for audio_write
            abs_filepath = os.path.abspath(filepath + '.wav')  # This is for checking the actual file
            
            print(f"Writing audio file to: {abs_filepath}")
            # Save the generated audio
            audio_write(filepath, wav[0].cpu(), musicgen.sample_rate, strategy="loudness", loudness_compressor=True)
            
            # Verify the file was written successfully
            if os.path.exists(abs_filepath):
                file_size = os.path.getsize(abs_filepath)
                if file_size > 0:
                    print(f"Successfully wrote audio file: {filename} ({file_size} bytes)")
                    audio_urls.append(f"/static/audio/{filename}")
                else:
                    print(f"Error: File was created but is empty")
            else:
                print(f"Error: File was not created at {abs_filepath}")
            
        except Exception as e:
            print(f"Error during audio generation or file writing: {str(e)}")
            continue

    return {"audio_urls": audio_urls}

# ===== SERVER STARTUP =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

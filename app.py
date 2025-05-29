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
SCENE_PROMPT_TEMPLATE = """Given the following scene description, provide:
1. A short atmospheric narrative (2-3 sentences)
2. A list of key sound elements that would be present
3. Suggested audio parameters for each sound element

Scene: {scene}

Format your response as JSON with the following structure:
{{
    "narrative": "string",
    "sound_elements": [
        {{
            "name": "string",
            "description": "string",
            "parameters": {{
                "volume": "float between 0 and 1",
                "pan": "float between -1 and 1",
                "effects": ["list of suggested effects"]
            }}
        }}
    ]
}}"""

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
    sound_elements = data.get("sound_elements", [])
    audio_urls = []

    for element in sound_elements:
        prompt = element["description"]
        print("Generating audio for prompt:", prompt)
        # Generate audio (10 seconds, stereo, 32000 Hz)
        wav = musicgen.generate([prompt], progress=True)
        print("Generated wav shape:", wav[0].shape)
        print("Sample rate:", musicgen.sample_rate)
        filename = f"{element['name'].replace(' ', '_')}.wav"
        filepath = os.path.join(AUDIO_OUTPUT_DIR, filename)
        # Save the generated audio
        audio_write(filepath, wav[0].cpu(), musicgen.sample_rate, strategy="loudness", loudness_compressor=True)
        audio_urls.append(f"/static/audio/{filename}")

    return {"audio_urls": audio_urls}

# ===== SERVER STARTUP =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

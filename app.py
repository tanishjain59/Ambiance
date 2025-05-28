# ===== IMPORTS AND SETUP =====
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, MODEL_CONFIG

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

# ===== LLM RESPONSE GENERATOR =====
# Uses OpenAI's streaming API
async def generate_chunks(prompt: str):
    try:
        stream = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            **MODEL_CONFIG
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'chunk': chunk.choices[0].delta.content})}\n\n"
                
    except Exception as e:
        error_message = f"Error: {str(e)}"
        yield f"data: {json.dumps({'chunk': error_message})}\n\n"

# ===== CHAT ENDPOINT =====
# INTERACTS WITH FRONTEND: Receives POST requests from main.tsx
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    prompt = data.get("prompt", "")
    
    # INTERACTS WITH FRONTEND: Sends streaming response back to main.tsx
    return StreamingResponse(
        generate_chunks(prompt),
        media_type="text/event-stream"
    )

# ===== SERVER STARTUP =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

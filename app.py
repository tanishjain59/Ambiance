# ===== IMPORTS AND SETUP =====
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

app = FastAPI()

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
# Simulates streaming LLM responses
async def generate_chunks(prompt: str):
    response = f"This is a simulated response to: {prompt}"
    for word in response.split():
        yield f"data: {json.dumps({'chunk': word})}\n\n"
        await asyncio.sleep(0.1)

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

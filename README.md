# Ambiance: LLM-Powered Ambient Audio Generator & Mixer

Ambiance is a web application that lets you generate immersive ambient soundscapes from text and/or images using LLMs and AudioCraft, then mix the resulting audio layers in your browser with real-time controls.

## Features

- **Text & Image Input:** Describe a scene or upload an image to inspire the soundscape.
- **LLM Scene Generation:** Uses an LLM to create a narrative and list of sound elements.
- **AudioCraft Integration:** Generates unique audio files for each sound element.
- **Mixer Interface:** Adjust volume and pan for each audio layer with a visual vertical bar UI and fallback audio playback.
- **Modern UI:** Built with React, TypeScript, and Tone.js for a smooth, interactive experience.

## Project Structure

```
LLM_Application/
├── app.py                # FastAPI backend (serves API and static files)
├── src/
│   ├── main.tsx          # React app entry point
│   └── components/       # React components (TitlePage, GeneratePage, MixerPage)
├── static/               # Built frontend assets (after `npm run build`)
├── index.html            # Main HTML file
├── vite.config.ts        # Vite config for frontend build
├── requirements.txt      # Python dependencies
├── package.json          # Node.js dependencies and scripts
└── README.md             # This file
```

## Setup

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd LLM_Application
```

### 2. Python Backend Setup

- Install Python 3.9+
- Create a virtual environment:
  ```sh
  python3 -m venv venv
  source venv/bin/activate
  ```
- Install dependencies:
  ```sh
  pip install -r requirements.txt
  ```
- Set up your OpenAI API key and any other secrets in a `.env` file or `config.py` as needed.

### 3. Frontend Setup

- Install Node.js (v18+ recommended)
- Install dependencies:
  ```sh
  npm install
  ```

## Development Workflow

### Start the Backend

```sh
uvicorn app:app --reload
```

### Start the Frontend (Dev Mode)

```sh
npm run dev
```

- Visit [http://localhost:5173](http://localhost:5173) for the Vite dev server.
- API requests are proxied to the backend.

### Build Frontend for Production

```sh
npm run build
```

- This outputs static files to the `static/` directory, which FastAPI serves.
- Visit [http://localhost:8000](http://localhost:8000) to use the app via the backend.

## Usage

1. **Title Page:** Click "Get Started".
2. **Generate Page:** Enter a scene description and/or upload an image. Click "Generate Scene".
3. **Review:** Read the generated narrative and sound elements. Click "Generate Audio".
4. **Mix:** After audio is ready, click "Let's Mix!" to adjust volume and pan for each layer. Use the vertical bars and fallback audio players as needed.

## Troubleshooting

- If audio does not play, check your browser's permissions and try the fallback `<audio>` controls.
- If you see errors in the console or terminal, ensure all dependencies are installed and the backend is running.
- For CORS or proxy issues, check `vite.config.ts` and backend CORS settings.

## License

MIT License

---

_Created by Tanish Jain._

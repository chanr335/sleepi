# Sleepi

A sleep tracking and AI-powered sleep coaching application built for Hack Western 2025.

## Project Structure

```
sleepi/
├── client/          # Frontend React application
│   └── sleepi/      # Vite + React app
├── server/          # Backend FastAPI server
├── data/            # Sleep data files (CSV)
└── scripts/         # Data processing scripts
```

## Prerequisites

### Backend
- Python 3.11 or higher
- pip (Python package manager)

### Frontend
- Node.js 18+ and npm

## Setup Instructions

### Backend Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment:**
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up environment variables:**
   
   Create a `.env` file in the `server/` directory with the following variables:
   
   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional (only needed for TTS/ASMR features)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ELEVENLABS_VOICE_ID_DELILAH=your_delilah_voice_id
   ELEVENLABS_VOICE_ID_VINCENT=your_vincent_voice_id
   ELEVENLABS_VOICE_ID_TIZA=your_tiza_voice_id
   ```
   
   **Note:** The `GEMINI_API_KEY` is required for the application to run. The ElevenLabs keys are only needed if you plan to use the ASMR/TTS features.

6. **Verify data directory exists:**
   
   Ensure that the `data/parsed/` directory exists in the project root and contains the sleep data CSV files (e.g., `sleep_by_night_chandler.csv`, `sleep_by_night_eileen.csv`, etc.).

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd client/sleepi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Activate your virtual environment (if not already activated):**
   ```bash
   source venv/bin/activate  # macOS/Linux
   # or
   venv\Scripts\activate      # Windows
   ```

3. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload
   ```
   
   The server will start on `http://localhost:8000` by default.
   
   - API documentation will be available at: `http://localhost:8000/docs`
   - Alternative docs at: `http://localhost:8000/redoc`

### Start the Frontend Development Server

1. **Navigate to the frontend directory:**
   ```bash
   cd client/sleepi
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   
   The frontend will start on `http://localhost:5173` by default (Vite's default port).

## Accessing the Application

Once both servers are running:
- **Frontend:** Open your browser and navigate to `http://localhost:5173`
- **Backend API:** Available at `http://localhost:8000`
- **API Docs:** Available at `http://localhost:8000/docs`

## Available Scripts

### Frontend Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend

The backend is run using `uvicorn` directly. The `--reload` flag enables auto-reload during development.

## Troubleshooting

### Backend Issues

- **"GEMINI_API_KEY environment variable not set"**: Make sure you've created a `.env` file in the `server/` directory with your API key.
- **"Data directory not found"**: Ensure the `data/parsed/` directory exists in the project root with the required CSV files.
- **Import errors**: Make sure you've activated your virtual environment and installed all dependencies.

### Frontend Issues

- **Port already in use**: If port 5173 is in use, Vite will automatically try the next available port. Check the terminal output for the actual port.
- **Module not found**: Run `npm install` again to ensure all dependencies are installed.

### CORS Issues

The backend is configured to allow all origins (`allow_origins=["*"]`), so CORS issues should not occur. If you encounter CORS errors, ensure:
1. The backend server is running
2. The frontend is making requests to the correct backend URL (default: `http://localhost:8000`)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for text-to-speech |
| `ELEVENLABS_VOICE_ID_DELILAH` | No | Voice ID for Delilah voice |
| `ELEVENLABS_VOICE_ID_VINCENT` | No | Voice ID for Vincent voice |
| `ELEVENLABS_VOICE_ID_TIZA` | No | Voice ID for Tiza voice |

## Development Notes

- The backend uses FastAPI with automatic API documentation
- The frontend uses React with Vite for fast development
- Both servers support hot-reload during development
- Sleep data is stored in CSV format in the `data/parsed/` directory

## License

Built for Hack Western 2025

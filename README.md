# SpectraScribe

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)
![React](https://img.shields.io/badge/react-19-61dafb.svg)
![Gemini](https://img.shields.io/badge/AI-Gemini_Pro-8e44ad.svg)

**SpectraScribe** is a real-time audio analysis and transcription tool designed to make environments more accessible for the deaf and hard of hearing. It combines visual audio representations (Spectrogram, Waterfall) with live, multi-user AI transcription and chat.

## Features

*   **Real-time Transcription**: Powered by Google's Gemini 2.0 Flash API for low-latency speech-to-text.
*   **Visual Feedback**:
    *   **Spectrogram**: Live frequency analysis.
    *   **Waterfall Plot**: Historical visualization of audio frequency intensity.
*   **Live Chat**: Mixed-media chat interface where typed messages and spoken transcriptions live side-by-side.
*   **Speaker Identification**: Color-coded usernames for easy visual distinction.
*   **Accessibility First**: High-contrast dark mode UI designed for readability.
*   **Containerized**: Fully Dockerized for easy deployment.

## Tech Stack

*   **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons
*   **Backend**: Node.js, Express, Socket.io
*   **AI**: Google Generative AI (Gemini 2.0 Flash)
*   **Infrastructure**: Docker, Nginx

## Prerequisites

*   **Docker** and **Docker Compose**
*   **Google Gemini API Key**: Get one at [AI Studio](https://aistudio.google.com/).

## Quick Start (Docker)

This is the recommended way to run SpectraScribe.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/RandomArray/SpectraScribe.git
    cd SpectraScribe
    ```

2.  **Create configuration**:
    Create a `.env` file in the root directory:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

3.  **Launch**:
    ```bash
    docker-compose up --build -d
    ```

4.  **Access**:
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Manual Installation (Development)

If you want to run it without Docker for development:

### Backend
1.  Navigate to `server/`:
    ```bash
    cd server
    npm install
    node index.js
    ```
    *Server runs on port 3001.*

### Frontend
1.  Open a new terminal in the project root:
    ```bash
    npm install
    # Ensure GEMINI_API_KEY is in your environment or .env
    npm run dev
    ```
    *Frontend runs on port 3000.*

## Architecture

The application uses a split architecture:

*   **Frontend**: Connects directly to Gemini API for audio streaming (to minimize latency) and to the local backend for chat synchronization via Socket.io.
*   **Backend**: A lightweight Node.js Server that handles room management and message broadcasting.
*   **Nginx (Docker)**: Serves static assets and proxies WebSocket connections in production.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

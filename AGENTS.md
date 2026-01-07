# AGENTS.md

## Project Overview
SpectraScribe is a specific accessibility tool for the deaf, providing real-time audio visualization (spectrograms) and transcription. It uses a React frontend, Node/Express backend, and Google's Gemini API.

## Setup & Commands

- **Install Dependencies**:
  - Root (Frontend): `npm install`
  - Server (Backend): `cd server && npm install`

- **Development**:
  - Start Frontend: `npm run dev` (Port 3000)
  - Start Backend: `node server/index.js` (Port 3001)
  - **Environment**: Require `GEMINI_API_KEY` in `.env` (root).

- **Docker (Preferred)**:
  - Build & Run: `docker-compose up --build -d`
  - Logs: `docker-compose logs -f`

- **Testing**:
  - Run Unit Tests: `npm test`
  - Test Stack: Vitest, React Testing Library.

## key Architecture Decisions

1. **Dual Connection**: Clients connect to Gemini API *directly* for audio streaming (to reduce latency), but connect to the Node.js backend for Chat synchronization.
2. **State Management**: React `useState` and `useRef`. Custom hooks `useLiveAudio` (Gemini) and `useChat` (Socket.io).
3. **Styling**: TailwindCSS. Dark mode by default (Slate-950 background).
4. **Ports**:
   - Frontend: 3000
   - Backend: 3001 (Proxied via Nginx in Docker to `/socket.io`)

## Code Style

- **Framework**: React 19 (Functional Components + Hooks).
- **Language**: TypeScript throughout.
- **Icons**: Lucide-React.
- **Formatting**: 2 spaces indentation.
- **Strictness**: No `any` if possible. Define interfaces in `types.ts`.

## File Structure

- `App.tsx`: Main layout (Header, Grid for Viz + Chat).
- `hooks/`: Business logic.
  - `useLiveAudio.ts`: AudioContext & Gemini WebSockets.
  - `useChat.ts`: Socket.io client logic.
- `components/`:
  - `ChatInterface.tsx`: Unified chat & log view.
  - `Spectrogram.tsx` / `Waterfall.tsx`: Canvas visualizations.
- `server/`: Backend logic.

## Common Operations

### Adding a new message type
1. Update `ChatMessage` interface in `types.ts`.
2. Update `server/index.js` to handle/broadcast the type.
3. Update `components/ChatInterface.tsx` to render it.

### Changing Audio Settings
- Sample rate is fixed at 16kHz for Gemini compatibility.
- FFT Size in `useLiveAudio` controls visualization resolution.

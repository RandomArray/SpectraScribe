export interface AudioState {
  isRecording: boolean;
  isConnected: boolean;
  error: string | null;
}

export interface TranscriptionItem {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  source: 'user' | 'model';
}

export interface VisualizerSettings {
  waterfallDuration: number; // in seconds
  sensitivity: number; // gain multiplier
  colorMap: 'magma' | 'viridis' | 'inferno';
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}
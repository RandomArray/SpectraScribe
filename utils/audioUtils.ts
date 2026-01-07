import { Blob } from '@google/genai';

/**
 * Converts Float32Array PCM audio data to the format expected by Gemini (Int16, 16kHz usually handled by context).
 */
export function createBlob(data: Float32Array, sampleRate: number): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp and scale to 16-bit integer range
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Maps a value (0-255) to a color string based on a heatmap style.
 */
export function getHeatmapColor(value: number, palette: 'magma' | 'viridis' | 'inferno'): string {
  const normalized = value / 255;
  
  // Simple Magma-like approximation
  // Black -> Purple -> Red -> Orange -> Yellow -> White
  
  if (palette === 'inferno') {
     // Black to Yellowish
     if (normalized < 0.2) return `rgb(${normalized * 50}, 0, ${normalized * 100})`;
     if (normalized < 0.5) return `rgb(${normalized * 180}, ${normalized * 40}, ${normalized * 100})`;
     if (normalized < 0.8) return `rgb(255, ${normalized * 200}, 0)`;
     return `rgb(255, 255, ${normalized * 255})`;
  }

  // Default Magma-ish
  const r = Math.min(255, Math.floor(normalized * 255 * 1.5));
  const g = Math.min(255, Math.floor(Math.pow(normalized, 2) * 255));
  const b = Math.min(255, Math.floor(Math.sin(normalized * Math.PI) * 200) + 50);

  return `rgb(${r}, ${g}, ${b})`;
}

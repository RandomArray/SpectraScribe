import React, { useEffect, useRef } from 'react';
import { getHeatmapColor } from '../utils/audioUtils';

interface WaterfallProps {
  analyser: AnalyserNode | null;
  durationSeconds?: number;
}

const Waterfall: React.FC<WaterfallProps> = ({ analyser, durationSeconds = 60 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Create offscreen canvas for scroll performance
    if (!tempCanvasRef.current) {
        tempCanvasRef.current = document.createElement('canvas');
    }
    const tempCanvas = tempCanvasRef.current;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    if (!ctx || !tempCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Sync dimensions
    const updateDimensions = () => {
        const rect = canvas.parentElement?.getBoundingClientRect();
        if (rect) {
            // Only update if dimensions changed to avoid clearing history unnecessarily
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
                tempCanvas.width = rect.width;
                tempCanvas.height = rect.height;
                
                // Clear to black
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                tempCtx.fillStyle = '#000';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            }
        }
    };
    updateDimensions();

    const draw = (timestamp: number) => {
      if (!analyser) return;

      // Calculate time delta
      const deltaTime = timestamp - lastDrawTimeRef.current;
      lastDrawTimeRef.current = timestamp;

      // Calculate the interval needed per row to satisfy the duration
      // pixelsPerSecond = height / durationSeconds
      // msPerRow = 1000 / pixelsPerSecond = (1000 * duration) / height
      const msPerRow = (durationSeconds * 1000) / canvas.height;
      
      accumulatorRef.current += deltaTime;

      // Only draw if enough time has passed for a new row (1px height)
      if (accumulatorRef.current >= msPerRow) {
        accumulatorRef.current %= msPerRow; // Keep remainder for smooth timing
        
        analyser.getByteFrequencyData(dataArray);

        const w = canvas.width;
        const h = canvas.height;

        // 1. Snapshot current canvas to temp
        tempCtx.clearRect(0, 0, w, h);
        tempCtx.drawImage(canvas, 0, 0);

        // 2. Draw temp back to canvas, shifted down by 1 pixel
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(tempCanvas, 0, 1);

        // 3. Draw new row at top (y=0)
        const rowData = ctx.createImageData(w, 1);
        
        for (let x = 0; x < w; x++) {
            // Linear frequency mapping
            const freqIndex = Math.floor((x / w) * bufferLength);
            const value = dataArray[freqIndex]; // 0-255

            // Color Mapping
            const normalized = value / 255;
            // Magma-like
            const r = Math.min(255, Math.floor(normalized * 255 * 1.5));
            const g = Math.min(255, Math.floor(Math.pow(normalized, 2) * 255));
            const b = Math.min(255, Math.floor(Math.sin(normalized * Math.PI) * 200) + 50);

            const pixelIndex = x * 4;
            rowData.data[pixelIndex] = r;
            rowData.data[pixelIndex + 1] = g;
            rowData.data[pixelIndex + 2] = b;
            rowData.data[pixelIndex + 3] = 255; // Alpha
        }
        ctx.putImageData(rowData, 0, 0);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    lastDrawTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(draw);

    const handleResize = () => {
        updateDimensions();
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, durationSeconds]);

  return (
    <div className="w-full h-full relative bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-inner cursor-crosshair">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute top-2 right-2 text-xs text-slate-500 font-mono pointer-events-none bg-black/50 px-2 py-1 rounded">
         -{durationSeconds}s History
      </div>
    </div>
  );
};

export default Waterfall;
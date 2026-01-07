import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, MoveHorizontal } from 'lucide-react';

interface SpectrogramProps {
  analyser: AnalyserNode | null;
  className?: string;
}

const Spectrogram: React.FC<SpectrogramProps> = ({ analyser, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Zoom state: 1 (full view) to 10 (10x zoom)
  const [zoom, setZoom] = useState(1);
  // Pan state: 0 (left) to 1 (right). Valid range depends on zoom.
  const [pan, setPan] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseXRef = useRef(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      analyser.getByteFrequencyData(dataArray);

      // Clear
      ctx.fillStyle = 'rgba(15, 23, 42, 1)';
      ctx.fillRect(0, 0, width, height);

      // Calculate view window based on zoom and pan
      const viewSize = Math.floor(bufferLength / zoom);
      const maxStart = bufferLength - viewSize;
      
      // Ensure pan is within bounds
      // effectiveStart is the index in dataArray
      const effectiveStart = Math.floor(Math.min(maxStart, Math.max(0, pan * maxStart)));
      const effectiveEnd = effectiveStart + viewSize;

      // Draw bars
      const barWidth = width / viewSize;
      
      for (let i = 0; i < viewSize; i++) {
        const dataIndex = effectiveStart + i;
        if (dataIndex >= bufferLength) break;

        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * height;

        // Gradient color based on intensity
        const hue = (dataIndex / bufferLength) * 300; // Map freq to hue
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;

        // Add 0.5 for sharpness in some browsers, though minor
        ctx.fillRect(i * barWidth, height - barHeight, barWidth + 1, barHeight);
      }
      
      // Draw Frequency Labels/Grid
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      
      // Nyquist is usually sampleRate / 2. For 16kHz context, it's 8000Hz.
      const maxFreq = analyser.context.sampleRate / 2;
      
      // Draw a few grid lines
      const steps = 5;
      for (let i = 0; i <= steps; i++) {
          const x = (width / steps) * i;
          // Calculate freq at this x
          // relative position in view window: i/steps
          // absolute bin index: effectiveStart + (i/steps * viewSize)
          const binIndex = effectiveStart + (i / steps * viewSize);
          const freq = Math.round((binIndex / bufferLength) * maxFreq);
          
          if (i < steps) { // Don't draw last one if it clips edge
             ctx.fillText(`${freq}Hz`, x + 2, height - 5);
             ctx.fillStyle = 'rgba(255,255,255,0.1)';
             ctx.fillRect(x, 0, 1, height);
             ctx.fillStyle = '#64748b';
          }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, zoom, pan]);

  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && canvasRef.current.parentElement) {
            canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
            canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Event Handlers for Zoom/Pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
      e.preventDefault();
      // Zoom in/out
      const delta = -Math.sign(e.deltaY) * 0.5;
      setZoom(prev => Math.min(10, Math.max(1, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      lastMouseXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      
      // Adjust pan based on deltaX relative to width
      if (canvasRef.current) {
          const width = canvasRef.current.width;
          const panDelta = -(deltaX / width) / zoom; // Invert drag direction for natural feel? Or direct. 
          // Usually dragging left moves view right -> pan increases.
          setPan(prev => Math.min(1, Math.max(0, prev + panDelta)));
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  return (
    <div className={`relative w-full h-full group ${className}`}>
        <canvas 
            ref={canvasRef} 
            className={`block w-full h-full cursor-col-resize ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
        
        {/* Overlay Info */}
        <div className="absolute top-2 right-2 flex gap-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-cyan-400 flex items-center gap-1 border border-cyan-900/50">
                <ZoomIn className="w-3 h-3" />
                {zoom.toFixed(1)}x
            </div>
            {zoom > 1 && (
                <div className="bg-black/60 backdrop-blur px-2 py-1 rounded text-xs text-orange-400 flex items-center gap-1 border border-orange-900/50">
                    <MoveHorizontal className="w-3 h-3" />
                    {Math.round(pan * 100)}%
                </div>
            )}
        </div>
        
        {/* Instructions Hint */}
        {zoom === 1 && (
            <div className="absolute bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2 text-slate-600 text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-1 rounded">
                Scroll to Zoom • Drag to Pan
            </div>
        )}
    </div>
  );
};

export default Spectrogram;
import React, { useEffect, useRef } from 'react';
import { TranscriptionItem } from '../types';
import { Mic } from 'lucide-react';

interface TranscriptionLogProps {
  items: TranscriptionItem[];
}

const TranscriptionLog: React.FC<TranscriptionLogProps> = ({ items }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-3 border-b border-slate-700 bg-slate-900 flex items-center gap-2">
        <Mic className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200">Live Transcript</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {items.length === 0 && (
            <div className="text-slate-500 text-sm italic text-center mt-10">
                Listening for speech...
            </div>
        )}
        
        {items.map((item) => (
          <div key={item.id} className={`flex flex-col ${item.isFinal ? 'opacity-100' : 'opacity-60'}`}>
             <div className="text-xs text-slate-400 mb-1">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
             </div>
             <div className="bg-slate-700/50 p-3 rounded-lg text-slate-100 leading-relaxed break-words">
                {item.text}
             </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TranscriptionLog;

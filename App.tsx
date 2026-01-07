import React, { useState } from 'react';
import { useLiveAudio } from './hooks/useLiveAudio';
import Spectrogram from './components/Spectrogram';
import Waterfall from './components/Waterfall';
import TranscriptionLog from './components/TranscriptionLog';
import { Play, Square, Activity, Settings2, AlertCircle, Mic } from 'lucide-react';
import { ConnectionStatus } from './types';

function App() {
  const { 
    start, 
    stop, 
    status, 
    analyser, 
    transcriptions, 
    error,
    setGain
  } = useLiveAudio();

  const [waterfallDuration, setWaterfallDuration] = useState(60);
  const [sensitivity, setSensitivity] = useState(20); // 0-100 scale, defaults to 20% which we map to 1.0 gain

  const toggleRecording = () => {
    if (status === ConnectionStatus.CONNECTED || status === ConnectionStatus.CONNECTING) {
      stop();
    } else {
      start();
    }
  };

  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setSensitivity(val);
      // Map 0-100 to Gain 0.0 - 5.0
      // 20 -> 1.0
      const gainValue = val * 0.05; 
      setGain(gainValue);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-800">
            <Activity className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
             <h1 className="text-xl font-bold tracking-tight text-white">SpectraScribe</h1>
             <p className="text-xs text-slate-400">Audio Analysis & Live Transcription</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
           
           {/* Sensitivity Slider */}
           <div className="hidden md:flex flex-col gap-1 w-48">
               <div className="flex justify-between text-xs text-slate-400 font-medium">
                   <span className="flex items-center gap-1"><Mic className="w-3 h-3"/> Sensitivity</span>
                   <span>{sensitivity}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 value={sensitivity} 
                 onChange={handleSensitivityChange}
                 className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
               />
           </div>

           <div className="h-8 w-px bg-slate-800 hidden md:block" />

           {error && (
               <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-3 py-1.5 rounded-full text-xs border border-red-900/50">
                  <AlertCircle className="w-3 h-3" />
                  {error}
               </div>
           )}

           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border
              ${status === ConnectionStatus.CONNECTED ? 'bg-green-900/20 text-green-400 border-green-900/50' : 
                status === ConnectionStatus.CONNECTING ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                'bg-slate-800 text-slate-400 border-slate-700'}`}>
              <div className={`w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'animate-pulse bg-green-500' : 'bg-current'}`} />
              {status === ConnectionStatus.CONNECTED ? 'LIVE' : status.toUpperCase()}
           </div>

           <button 
             onClick={toggleRecording}
             className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all duration-200
               ${status === ConnectionStatus.CONNECTED 
                 ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20' 
                 : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'}`}
           >
             {status === ConnectionStatus.CONNECTED ? (
                <>
                   <Square className="w-4 h-4 fill-current" /> Stop
                </>
             ) : (
                <>
                   <Play className="w-4 h-4 fill-current" /> Start
                </>
             )}
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
        
        {/* Left Column: Visualizations (8/12) */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-h-[500px]">
           
           {/* Spectrogram (Top) */}
           <div className="h-1/3 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Frequency Spectrum</h2>
                 <span className="text-xs text-slate-600">Scroll to Zoom • Drag to Pan</span>
              </div>
              <div className="flex-1 relative rounded-lg overflow-hidden bg-black border border-slate-800">
                 <Spectrogram analyser={analyser} />
              </div>
           </div>

           {/* Waterfall (Bottom) */}
           <div className="h-2/3 bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
               <div className="flex justify-between items-center mb-2">
                 <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Waterfall History</h2>
                 <div className="flex items-center gap-2">
                     <Settings2 className="w-3 h-3 text-slate-600" />
                     <select 
                       className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-cyan-500"
                       value={waterfallDuration}
                       onChange={(e) => setWaterfallDuration(Number(e.target.value))}
                     >
                       <option value={30}>30s Window</option>
                       <option value={60}>60s Window</option>
                       <option value={120}>2m Window</option>
                     </select>
                 </div>
              </div>
              <div className="flex-1 relative border border-slate-800 rounded-lg overflow-hidden">
                 <Waterfall analyser={analyser} durationSeconds={waterfallDuration} />
              </div>
           </div>
        </div>

        {/* Right Column: Transcription (4/12) */}
        <div className="lg:col-span-4 h-full">
            <TranscriptionLog items={transcriptions} />
        </div>

      </main>
    </div>
  );
}

export default App;

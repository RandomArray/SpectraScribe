import React, { useState, useEffect, useRef } from 'react';
import { useLiveAudio } from './hooks/useLiveAudio';
import { useChat } from './hooks/useChat';
import Spectrogram from './components/Spectrogram';
import Waterfall from './components/Waterfall';
import ChatInterface from './components/ChatInterface';
import { Play, Square, Activity, Settings2, AlertCircle, Mic, Lock, LogIn } from 'lucide-react';
import { ConnectionStatus } from './types';

function App() {
  // Auth State
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [isJoined, setIsJoined] = useState(false);
  
  // Local temporary state for login form
  const [tempUsername, setTempUsername] = useState('');
  const [tempRoom, setTempRoom] = useState('general');

  // Hooks
  const { 
    start, 
    stop, 
    status, 
    analyser, 
    transcriptions, 
    error,
    setGain
  } = useLiveAudio();

  const { messages, sendMessage } = useChat(isJoined ? username : '', isJoined ? room : '');

  const [waterfallDuration, setWaterfallDuration] = useState(60);
  const [sensitivity, setSensitivity] = useState(20); 

  // Sync Transcriptions to Chat
  // We use a ref to track the last processed transcription ID to avoid duplicates 
  // or use the array length. Since useLiveAudio appends, we can just look at new items.
  // Actually, useChat will manage the history. useLiveAudio emits events.
  // We need to bridge them:
  useEffect(() => {
     if (!isJoined) return;

     // Warning: This simple logic might re-send history if transcriptions is reset.
     // Better: useLiveAudio provides a callback or we manually track "lastSentIndex".
     // For now, let's just send the LATEST item if it changes and is new.
  }, [transcriptions, isJoined]);

  // FIXME: The above bridge is tricky with React state. 
  // Let's modify useLiveAudio to expose an 'onTranscription' callback OR
  // we just watch the last item.
  const lastTranscriptionRef = useRef<string | null>(null);
  const currentUtteranceId = useRef<string | number | null>(null);

  useEffect(() => {
     if (!isJoined) return;
     const lastItem = transcriptions[transcriptions.length - 1];
     
     if (lastItem) {
          // If it's a model message, we might handle differently, but assuming user for now.
          if (lastItem.source !== 'user') return;

          // Generate a stable ID for the current pending utterance if needed
          if (!currentUtteranceId.current) {
              currentUtteranceId.current = `${username}-${Date.now()}`;
          }

          const uniqueKey = `${lastItem.id}-${lastItem.text}-${lastItem.isFinal}`;
          if (lastTranscriptionRef.current === uniqueKey) return;
         
          // Use the stable utterance ID
          sendMessage(lastItem.text, lastItem.isFinal, 'transcription', currentUtteranceId.current);
          
          lastTranscriptionRef.current = uniqueKey;

          // If this was the final message for the turn, reset the ID so the next utterance gets a new one
          if (lastItem.isFinal) {
              currentUtteranceId.current = null;
          }
     }
  }, [transcriptions, isJoined, sendMessage, username]);


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
      const gainValue = val * 0.05; 
      setGain(gainValue);
  };

  const handleJoin = (e: React.FormEvent) => {
      e.preventDefault();
      if (tempUsername.trim() && tempRoom.trim()) {
          setUsername(tempUsername);
          setRoom(tempRoom);
          setIsJoined(true);
      }
  };
  
  // Login Screen
  if (!isJoined) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                  <div className="flex flex-col items-center mb-8">
                       <div className="p-3 bg-cyan-900/30 rounded-xl border border-cyan-800 mb-4">
                            <Activity className="w-8 h-8 text-cyan-400" />
                       </div>
                       <h1 className="text-2xl font-bold text-white mb-2">SpectraScribe</h1>
                       <p className="text-slate-400 text-center text-sm">Join a secure room to start communicating.</p>
                  </div>
                  
                  <form onSubmit={handleJoin} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">DISPLAY NAME</label>
                          <input 
                            type="text" 
                            required
                            value={tempUsername}
                            onChange={e => setTempUsername(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                            placeholder="e.g. Alice"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">ROOM ID</label>
                          <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                                type="text" 
                                required
                                value={tempRoom}
                                onChange={e => setTempRoom(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                placeholder="general"
                            />
                          </div>
                      </div>
                      <button 
                        type="submit" 
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
                      >
                          <LogIn className="w-4 h-4" /> Join Room
                      </button>
                  </form>
              </div>
          </div>
      )
  }

  return (
    <div className="h-screen bg-slate-950 text-slate-200 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-800 hidden sm:block">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
             <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                 SpectraScribe 
                 <span className="text-[10px] font-normal px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 hidden sm:inline-block">
                     {room}
                 </span>
             </h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
           {/* Sensitivity Slider */}
           <div className="hidden lg:flex flex-col gap-1 w-32">
               <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                   <span className="flex items-center gap-1">Sens</span>
                   <span>{sensitivity}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="100" 
                 value={sensitivity} 
                 onChange={handleSensitivityChange}
                 className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
               />
           </div>

           {error && (
               <div className="hidden sm:flex items-center gap-2 text-red-400 bg-red-900/20 px-3 py-1.5 rounded-full text-xs border border-red-900/50">
                  <AlertCircle className="w-3 h-3" />
                  <span className="max-w-[100px] truncate">{error}</span>
               </div>
           )}

           <button 
             onClick={toggleRecording}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200
               ${status === ConnectionStatus.CONNECTED 
                 ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-900/20' 
                 : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'}`}
           >
             {status === ConnectionStatus.CONNECTED ? (
                <>
                   <Square className="w-3 h-3 fill-current" /> Stop
                </>
             ) : (
                <>
                   <Play className="w-3 h-3 fill-current" /> Listen
                </>
             )}
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* Left Column: Visualizations (Desktop) / Hidden on Mobile toggles could be added later */}
        {/* We make this collapsible or resizeable in future. For now, 60% width on Desktop. */}
        <div className="hidden lg:flex flex-col w-[60%] h-full border-r border-slate-800 bg-slate-950/50">
           
           {/* Spectrogram */}
           <div className="flex-1 min-h-0 p-4 pb-2 flex flex-col">
              <div className="mb-2 flex justify-between items-center px-1">
                 <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Realtime Spectrum</h2>
              </div>
              <div className="flex-1 relative rounded-lg overflow-hidden bg-black border border-slate-900 shadow-inner">
                 <Spectrogram analyser={analyser} />
              </div>
           </div>

           {/* Waterfall */}
           <div className="h-1/3 min-h-0 p-4 pt-0 flex flex-col">
               <div className="mb-2 flex justify-between items-center px-1">
                 <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">History</h2>
              </div>
              <div className="flex-1 relative border border-slate-900 rounded-lg overflow-hidden bg-black shadow-inner">
                 <Waterfall analyser={analyser} durationSeconds={waterfallDuration} />
              </div>
           </div>
        </div>

        {/* Right Column: Chat & Log (Full width on mobile, 40% on Desktop) */}
        <div className="flex-1 h-full w-full lg:w-[40%] bg-slate-900">
            <ChatInterface 
                messages={messages} 
                onSendMessage={sendMessage} 
                currentUser={username}
            />
        </div>

      </main>
    </div>
  );
}

export default App;

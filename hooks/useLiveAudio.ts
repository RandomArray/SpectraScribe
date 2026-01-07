import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionStatus, TranscriptionItem } from '../types';
import { createBlob } from '../utils/audioUtils';

const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

interface UseLiveAudioReturn {
  status: ConnectionStatus;
  isRecording: boolean;
  analyser: AnalyserNode | null;
  transcriptions: TranscriptionItem[];
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
  gain: number;
  setGain: (value: number) => void;
}

export const useLiveAudio = (): UseLiveAudioReturn => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [gain, setGain] = useState(1.0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sessionRef = useRef<any>(null); // Keep track of the Gemini session promise/object
  const currentTranscriptionRef = useRef<string>('');
  
  // Clean up function
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    sessionRef.current = null;
    setAnalyser(null);
    setIsRecording(false);
    setStatus(ConnectionStatus.DISCONNECTED);
  }, []);

  const updateGain = useCallback((value: number) => {
    setGain(value);
    if (gainNodeRef.current) {
      // Smooth transition
      gainNodeRef.current.gain.setTargetAtTime(value, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setStatus(ConnectionStatus.CONNECTING);
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found in environment.");
      }

      // 1. Initialize Audio Context (16kHz preferred for Gemini, but standard is fine if we downsample or send as is)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioCtx;

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Create Nodes
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = gain;
      gainNodeRef.current = gainNode;

      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 2048; 
      analyserNode.smoothingTimeConstant = 0.6; 
      setAnalyser(analyserNode);

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // 4. Connect Audio Graph: Source -> Gain -> Analyser
      source.connect(gainNode);
      gainNode.connect(analyserNode);

      // 5. Connect to Gemini Live API
      const ai = new GoogleGenAI({ apiKey });
      
      const sessionPromise = ai.live.connect({
        model: GEMINI_MODEL,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setStatus(ConnectionStatus.CONNECTED);
            setIsRecording(true);

            // Start Audio Work for sending to Gemini
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData, 16000);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            // Connect Gain -> Processor -> Destination
            // We connect gain to processor so the model hears the boosted audio
            gainNode.connect(processor);
            processor.connect(audioCtx.destination); 
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentTranscriptionRef.current += text;
                setTranscriptions(prev => {
                   const filtered = prev.filter(item => item.isFinal);
                   return [...filtered, {
                     id: 'pending',
                     text: currentTranscriptionRef.current,
                     timestamp: Date.now(),
                     isFinal: false,
                     source: 'user'
                   }];
                });
              }
            }

            if (message.serverContent?.turnComplete) {
               const finalText = currentTranscriptionRef.current;
               if (finalText.trim()) {
                 setTranscriptions(prev => {
                   const filtered = prev.filter(item => item.isFinal);
                   return [...filtered, {
                     id: Date.now().toString(),
                     text: finalText,
                     timestamp: Date.now(),
                     isFinal: true,
                     source: 'user'
                   }];
                 });
               }
               currentTranscriptionRef.current = '';
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setStatus(ConnectionStatus.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setError("Connection Error");
            setStatus(ConnectionStatus.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          systemInstruction: "You are a passive listener. You do not need to respond with audio unless directly asked. Your primary role is to listen.",
        }
      });

      sessionRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start audio engine");
      setStatus(ConnectionStatus.ERROR);
      cleanup();
    }
  }, [cleanup, gain]);

  const stop = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
            try {
               // Optional cleanup
            } catch(e) {}
        });
    }
    cleanup();
  }, [cleanup]);

  return {
    status,
    isRecording,
    analyser,
    transcriptions,
    start,
    stop,
    error,
    gain,
    setGain: updateGain
  };
};

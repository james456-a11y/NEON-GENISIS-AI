import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Activity, Radio } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

const LiveInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const sessionRef = useRef<any>(null); // To hold the actual session object for cleanup

  const stopSession = () => {
    if (sessionRef.current) {
        try {
            sessionRef.current.close();
        } catch(e) { console.error("Error closing session", e); }
        sessionRef.current = null;
    }
    
    // Stop all audio sources
    sourcesRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();

    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
    setIsActive(false);
  };

  const startSession = async () => {
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioContextRef.current = outputCtx;
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      nextStartTimeRef.current = 0;

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            // Input Stream Setup
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple volume visualization
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length) * 100);

              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              const ctx = outputAudioContextRef.current;
              if (!ctx) return;

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            
            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            setIsActive(false);
          },
          onerror: (e) => {
            console.error("Live Session Error", e);
            setError("Connection interrupted.");
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: "You are a helpful, high-tech AI assistant named Neon. Keep responses concise and conversational."
        }
      });

      sessionPromiseRef.current = sessionPromise;
      sessionPromise.then(s => {
          sessionRef.current = s;
          setIsActive(true);
      });

    } catch (e) {
      console.error(e);
      setError("Failed to initialize audio. Please ensure microphone permissions are granted.");
      setIsActive(false);
    }
  };

  useEffect(() => {
      // Cleanup on unmount
      return () => {
          stopSession();
      };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black relative overflow-hidden">
      {/* Visualizer Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-96 h-96 rounded-full bg-neon-blue/10 blur-[100px] transition-all duration-300 ${isActive ? 'scale-150 opacity-80' : 'scale-100 opacity-20'}`}></div>
        <div className={`w-64 h-64 rounded-full bg-neon-purple/20 blur-[80px] absolute transition-all duration-300 ${isActive ? 'scale-125 opacity-80' : 'scale-90 opacity-20'}`}></div>
      </div>

      <div className="z-10 flex flex-col items-center gap-8">
        <h2 className="text-3xl md:text-5xl font-display font-bold text-white tracking-widest uppercase mb-4 text-center">
          Live <span className="text-neon-pink">Nexus</span>
        </h2>
        
        <div className="relative">
          <div className={`absolute inset-0 rounded-full border-2 border-neon-blue/30 ${isActive ? 'animate-ping' : 'hidden'}`}></div>
          <button
            onClick={isActive ? stopSession : startSession}
            className={`
              w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500
              ${isActive 
                ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]' 
                : 'bg-neon-blue/10 border-neon-blue text-neon-blue hover:bg-neon-blue/20 shadow-[0_0_30px_rgba(0,243,255,0.3)]'}
            `}
          >
            {isActive ? <MicOff size={48} /> : <Mic size={48} />}
          </button>
        </div>

        <div className="h-12 flex items-end gap-1">
            {isActive ? (
                Array.from({length: 10}).map((_, i) => (
                    <div 
                        key={i} 
                        className="w-2 bg-neon-green rounded-t-full transition-all duration-75"
                        style={{ height: `${Math.max(10, Math.random() * volume * 2)}%` }}
                    />
                ))
            ) : (
                <div className="text-slate-500 font-sans flex items-center gap-2">
                    <Radio className="animate-pulse" size={16} />
                    SYSTEM STANDBY
                </div>
            )}
        </div>

        {error && (
            <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded border border-red-500/50">
                {error}
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveInterface;

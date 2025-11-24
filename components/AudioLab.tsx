import React, { useState } from 'react';
import { Mic, Speaker, FileAudio, Play, Upload } from 'lucide-react';
import { transcribeAudioFile, generateTextToSpeech } from '../services/geminiService';
import { blobToBase64, decode, decodeAudioData } from '../utils/audioUtils';

const AudioLab: React.FC = () => {
    const [mode, setMode] = useState<'tts' | 'transcribe'>('tts');
    const [textInput, setTextInput] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async () => {
        setIsLoading(true);
        setResult('');
        try {
            if (mode === 'tts') {
                if (!textInput) return;
                const base64Audio = await generateTextToSpeech(textInput);
                if (base64Audio) {
                    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                    const ctx = new AudioContext();
                    const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start();
                    setResult("Audio played successfully.");
                }
            } else {
                if (!audioFile) return;
                const b64 = await blobToBase64(audioFile);
                const text = await transcribeAudioFile(b64, audioFile.type || 'audio/mp3');
                setResult(text || "No transcription available.");
            }
        } catch (e) {
            console.error(e);
            setResult("Error processing request.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-900 p-8 overflow-y-auto">
             <div className="max-w-3xl mx-auto w-full">
                <h2 className="text-3xl font-display font-bold text-white mb-6 flex items-center gap-3">
                    <Speaker className="text-neon-green" /> Audio Lab
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button onClick={() => {setMode('tts'); setResult('');}} className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${mode === 'tts' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <Speaker size={32} />
                        <span className="font-bold">Text to Speech</span>
                    </button>
                    <button onClick={() => {setMode('transcribe'); setResult('');}} className={`p-6 rounded-xl border flex flex-col items-center gap-3 transition-all ${mode === 'transcribe' ? 'bg-neon-blue/10 border-neon-blue text-neon-blue' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        <FileAudio size={32} />
                        <span className="font-bold">Transcription</span>
                    </button>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    {mode === 'tts' ? (
                        <div className="space-y-4">
                            <label className="block text-slate-400">Enter text to speak (Gemini TTS)</label>
                            <textarea 
                                className="w-full bg-black/40 border border-slate-600 rounded-lg p-3 text-white h-32"
                                placeholder="Type something here..."
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <label className="block text-slate-400">Upload audio file to transcribe</label>
                            <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center relative cursor-pointer hover:border-neon-blue">
                                <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                {audioFile ? <p className="text-neon-blue font-bold">{audioFile.name}</p> : <div className="text-slate-500"><Upload className="mx-auto mb-2"/>Upload Audio</div>}
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleAction}
                        disabled={isLoading}
                        className="mt-6 w-full py-3 bg-neon-green text-black font-bold rounded-xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"/> : <Play size={20} />}
                        {mode === 'tts' ? "Generate Speech" : "Transcribe"}
                    </button>
                </div>

                {result && (
                    <div className="mt-8 bg-black/40 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-slate-400 text-sm mb-2 uppercase tracking-wide">Output</h3>
                        <p className="text-white font-sans whitespace-pre-wrap">{result}</p>
                    </div>
                )}
             </div>
        </div>
    );
};

export default AudioLab;

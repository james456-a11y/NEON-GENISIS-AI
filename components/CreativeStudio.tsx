import React, { useState } from 'react';
import { Image as IconImage, Video, Wand2, RefreshCw, Upload, Film } from 'lucide-react';
import { generateImage, editImage, generateVeoVideo } from '../services/geminiService';
import { ImageRatio, ImageSize } from '../types';
import { blobToBase64 } from '../utils/audioUtils';

const CreativeStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gen' | 'edit' | 'video'>('gen');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Image Gen Settings
  const [ratio, setRatio] = useState<ImageRatio>(ImageRatio.SQUARE);
  const [size, setSize] = useState<ImageSize>(ImageSize.K1);

  // Edit/Video Uploads
  const [sourceImage, setSourceImage] = useState<File | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setResultUrl(null);
    
    try {
      if (activeTab === 'gen') {
        const response = await generateImage(prompt, size, ratio);
        // Find image part
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
                break;
            }
        }
      } else if (activeTab === 'edit') {
          if (!sourceImage) throw new Error("Please upload a base image first.");
          const b64 = await blobToBase64(sourceImage);
          const response = await editImage(prompt, b64);
          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
                break;
            }
          }
      } else if (activeTab === 'video') {
          // Check for API Key selection for Veo
          const win = window as any;
          if (win.aistudio) {
              const hasKey = await win.aistudio.hasSelectedApiKey();
              if (!hasKey) {
                  await win.aistudio.openSelectKey();
                  // Re-check just in case, though we proceed optimistically
              }
          }

          let b64;
          if (sourceImage) {
              b64 = await blobToBase64(sourceImage);
          }
          
          const videoUri = await generateVeoVideo(prompt, b64, '16:9'); // Default landscape
          if (videoUri) {
              // Append key for fetching
              const finalUrl = `${videoUri}&key=${process.env.API_KEY}`;
              setResultUrl(finalUrl);
          } else {
              throw new Error("Video generation failed to return a URI.");
          }
      }
    } catch (e: any) {
        console.error(e);
        setError(e.message || "Operation failed.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full">
            <h2 className="text-3xl font-display font-bold text-white mb-6 flex items-center gap-3">
                <Wand2 className="text-neon-purple" /> Creation Forge
            </h2>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-700 pb-1">
                <button onClick={() => { setActiveTab('gen'); setResultUrl(null); }} 
                    className={`pb-2 px-4 font-sans font-bold transition-all ${activeTab === 'gen' ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-slate-500'}`}>
                    Image Generation
                </button>
                <button onClick={() => { setActiveTab('edit'); setResultUrl(null); }} 
                    className={`pb-2 px-4 font-sans font-bold transition-all ${activeTab === 'edit' ? 'text-neon-pink border-b-2 border-neon-pink' : 'text-slate-500'}`}>
                    Image Editing
                </button>
                <button onClick={() => { setActiveTab('video'); setResultUrl(null); }} 
                    className={`pb-2 px-4 font-sans font-bold transition-all ${activeTab === 'video' ? 'text-neon-green border-b-2 border-neon-green' : 'text-slate-500'}`}>
                    Veo Video
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                        {/* Tab Specific Inputs */}
                        {(activeTab === 'edit' || activeTab === 'video') && (
                            <div className="mb-4">
                                <label className="block text-slate-400 text-sm mb-2">Source Image {activeTab === 'video' && "(Optional)"}</label>
                                <div className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center hover:border-neon-blue transition-colors cursor-pointer relative">
                                    <input type="file" accept="image/*" onChange={(e) => setSourceImage(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    {sourceImage ? (
                                        <p className="text-neon-blue font-bold">{sourceImage.name}</p>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500">
                                            <Upload className="mb-2" />
                                            <span>Click to Upload</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-slate-400 text-sm mb-2">Prompt</label>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-white focus:border-neon-blue outline-none h-32 resize-none"
                                placeholder={
                                    activeTab === 'gen' ? "A futuristic neon city with flying cars..." :
                                    activeTab === 'edit' ? "Add a cybernetic arm to the person..." :
                                    "A cinematic drone shot of a mountain..."
                                }
                            />
                        </div>

                        {activeTab === 'gen' && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-slate-400 text-xs mb-1">Aspect Ratio</label>
                                    <select value={ratio} onChange={(e) => setRatio(e.target.value as ImageRatio)} className="w-full bg-black/50 border border-slate-600 text-white rounded p-2 text-sm">
                                        {Object.values(ImageRatio).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-400 text-xs mb-1">Resolution</label>
                                    <select value={size} onChange={(e) => setSize(e.target.value as ImageSize)} className="w-full bg-black/50 border border-slate-600 text-white rounded p-2 text-sm">
                                        {Object.values(ImageSize).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleGenerate}
                            disabled={isLoading || (!prompt && !sourceImage)}
                            className="w-full py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-xl shadow-[0_0_20px_rgba(188,19,254,0.4)] hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" /> : activeTab === 'video' ? <Film /> : <IconImage />}
                            {isLoading ? "Generating..." : "Generate"}
                        </button>
                        
                        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
                    </div>
                </div>

                {/* Preview */}
                <div className="bg-black/40 rounded-2xl border border-slate-800 flex items-center justify-center min-h-[400px] relative overflow-hidden">
                    {resultUrl ? (
                         activeTab === 'video' ? (
                             <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-full rounded-lg shadow-2xl" />
                         ) : (
                             <img src={resultUrl} alt="Generated result" className="max-w-full max-h-full rounded-lg shadow-2xl" />
                         )
                    ) : (
                        <div className="text-slate-600 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full border-2 border-slate-700 mb-4 flex items-center justify-center">
                                <Wand2 />
                            </div>
                            <p>Result will appear here</p>
                        </div>
                    )}
                    
                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                            <RefreshCw className="w-12 h-12 text-neon-blue animate-spin mb-4" />
                            <p className="text-neon-blue font-display animate-pulse">
                                {activeTab === 'video' ? "RENDERING VEO VIDEO..." : "SYNTHESIZING PIXELS..."}
                            </p>
                            {activeTab === 'video' && <p className="text-slate-400 text-xs mt-2">This may take a minute.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CreativeStudio;

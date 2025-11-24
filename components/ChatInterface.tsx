import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, MapPin, Search, Brain, Image as ImageIcon, Video } from 'lucide-react';
import { generateChatResponse } from '../services/geminiService';
import { ChatMessage, GroundingChunk } from '../types';
import { blobToBase64 } from '../utils/audioUtils';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  
  // Tools state
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !selectedVideo) || isLoading) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: selectedImage ? URL.createObjectURL(selectedImage) : undefined,
      videoUrl: selectedVideo ? URL.createObjectURL(selectedVideo) : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Determine model and tools
      // Default to Flash Lite for speed as requested
      let model = 'gemini-flash-lite-latest'; 
      
      if (useThinking) {
        model = 'gemini-3-pro-preview'; // Thinking requires Pro 3
      } else if (selectedImage || selectedVideo) {
        // Multimodal analysis requires Pro
        model = 'gemini-3-pro-preview';
      } else if (input.toLowerCase().includes('analyze') || input.toLowerCase().includes('complex')) {
        // Complex text tasks use Pro
        model = 'gemini-3-pro-preview';
      }

      // Prepare assets
      let imageBase64: string[] = [];
      if (selectedImage) {
        const b64 = await blobToBase64(selectedImage);
        imageBase64.push(b64);
      }
      
      let videoData;
      if (selectedVideo) {
          const b64 = await blobToBase64(selectedVideo);
          videoData = { mimeType: selectedVideo.type, data: b64 };
      }

      const toolType = useSearch ? 'search' : useMaps ? 'maps' : 'none';

      const response = await generateChatResponse(
        model, 
        [], 
        newMessage.text || (selectedImage ? "Describe this image" : "Analyze this video"), 
        imageBase64,
        videoData,
        toolType,
        useThinking
      );

      const responseText = response.text || "No text response generated.";
      
      // Extract grounding
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      const links = chunks?.flatMap(c => {
          const items = [];
          if (c.web) items.push(c.web);
          if (c.maps) items.push(c.maps);
          return items;
      }) || [];

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        groundingLinks: links,
        isThinking: useThinking
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "System Error: Neural link interrupted. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setSelectedImage(null);
      setSelectedVideo(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-sm relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-10 left-10 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-64 h-64 bg-neon-pink/10 rounded-full blur-3xl"></div>
        </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 z-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] md:max-w-[70%] p-4 rounded-2xl border backdrop-blur-md
              ${msg.role === 'user' 
                ? 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue rounded-tr-none shadow-[0_0_15px_rgba(0,243,255,0.1)]' 
                : 'bg-slate-800/80 border-neon-purple/20 text-slate-200 rounded-tl-none shadow-[0_0_15px_rgba(188,19,254,0.1)]'}
            `}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-3 border border-white/10" />
              )}
              {msg.videoUrl && (
                  <video src={msg.videoUrl} controls className="max-w-full h-auto rounded-lg mb-3 border border-white/10" />
              )}
              <div className="whitespace-pre-wrap font-sans leading-relaxed">
                {msg.text}
              </div>
              
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-slate-400 mb-2 font-display">SOURCES:</p>
                      <div className="flex flex-wrap gap-2">
                          {msg.groundingLinks.map((link, i) => (
                              <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" 
                                 className="text-xs bg-black/30 hover:bg-neon-blue/20 text-neon-blue px-2 py-1 rounded border border-neon-blue/20 transition-colors">
                                  {link.title}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
              {msg.isThinking && (
                  <div className="mt-2 text-xs text-neon-pink font-display opacity-70 flex items-center gap-1">
                      <Brain size={12} /> Thinking Process Active
                  </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start animate-pulse">
                <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-700 text-neon-blue font-display text-sm shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                    PROCESSING...
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5 z-20">
        <div className="max-w-4xl mx-auto">
            {/* Tool Toggles */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                <button onClick={() => { setUseSearch(!useSearch); setUseMaps(false); setUseThinking(false); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display border transition-all ${useSearch ? 'bg-neon-blue text-black border-neon-blue shadow-[0_0_10px_#00f3ff]' : 'bg-transparent text-slate-400 border-slate-600'}`}>
                    <Search size={12} /> Search Grounding
                </button>
                <button onClick={() => { setUseMaps(!useMaps); setUseSearch(false); setUseThinking(false); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display border transition-all ${useMaps ? 'bg-neon-green text-black border-neon-green shadow-[0_0_10px_#0aff00]' : 'bg-transparent text-slate-400 border-slate-600'}`}>
                    <MapPin size={12} /> Maps Grounding
                </button>
                <button onClick={() => { setUseThinking(!useThinking); setUseSearch(false); setUseMaps(false); }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-display border transition-all ${useThinking ? 'bg-neon-purple text-white border-neon-purple shadow-[0_0_10px_#bc13fe]' : 'bg-transparent text-slate-400 border-slate-600'}`}>
                    <Brain size={12} /> Deep Thinking
                </button>
            </div>

            {/* Input Area */}
            <div className="flex items-end gap-2 bg-slate-800/50 p-2 rounded-2xl border border-slate-700 focus-within:border-neon-blue/50 transition-colors shadow-lg">
                <div className="flex gap-1 pb-2 pl-2">
                    <label className="cursor-pointer text-slate-400 hover:text-neon-blue transition-colors">
                        <ImageIcon size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            if(e.target.files?.[0]) { setSelectedImage(e.target.files[0]); setSelectedVideo(null); }
                        }} />
                    </label>
                    <label className="cursor-pointer text-slate-400 hover:text-neon-pink transition-colors">
                        <Video size={20} />
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                             if(e.target.files?.[0]) { setSelectedVideo(e.target.files[0]); setSelectedImage(null); }
                        }} />
                    </label>
                </div>
                
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={selectedImage ? "Ask about this image..." : selectedVideo ? "Ask about this video..." : "Ask Gemini anything..."}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-slate-200 placeholder-slate-500 resize-none max-h-32 py-2"
                    rows={1}
                />
                
                <button 
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !selectedImage && !selectedVideo)}
                    className="p-2 bg-neon-blue text-black rounded-xl hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(0,243,255,0.4)]"
                >
                    <Send size={20} />
                </button>
            </div>
            {(selectedImage || selectedVideo) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-neon-blue bg-neon-blue/10 px-3 py-1 rounded-lg w-fit border border-neon-blue/20">
                    <span>{selectedImage ? "Image selected" : "Video selected"}</span>
                    <button onClick={() => { setSelectedImage(null); setSelectedVideo(null); }} className="hover:text-white">×</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
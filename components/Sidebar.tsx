import React from 'react';
import { MessageSquare, Mic, Image as ImageIcon, Music, Cpu } from 'lucide-react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode }) => {
  const navItems = [
    { mode: AppMode.CHAT, icon: MessageSquare, label: 'Neon Chat' },
    { mode: AppMode.LIVE, icon: Mic, label: 'Live Nexus' },
    { mode: AppMode.CREATION, icon: ImageIcon, label: 'Creation Forge' },
    { mode: AppMode.AUDIO_LAB, icon: Music, label: 'Audio Lab' },
  ];

  return (
    <div className="w-20 md:w-64 bg-black border-r border-neon-blue/30 flex flex-col items-center md:items-stretch py-6 z-50">
      <div className="mb-10 px-4 flex items-center justify-center md:justify-start gap-3">
        <Cpu className="w-8 h-8 text-neon-pink animate-pulse" />
        <span className="hidden md:block font-display font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">
          NEON GENESIS
        </span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-2 px-2">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => setMode(item.mode)}
            className={`
              flex items-center gap-4 p-3 rounded-xl transition-all duration-300
              ${currentMode === item.mode 
                ? 'bg-neon-blue/10 text-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.3)] border border-neon-blue/50' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'}
            `}
          >
            <item.icon className="w-6 h-6" />
            <span className="hidden md:block font-sans font-medium tracking-wide">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="px-4 text-center hidden md:block">
        <p className="text-xs text-slate-600 font-display">POWERED BY GEMINI</p>
      </div>
    </div>
  );
};

export default Sidebar;

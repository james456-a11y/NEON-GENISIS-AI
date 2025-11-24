import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import CreativeStudio from './components/CreativeStudio';
import AudioLab from './components/AudioLab';
import { AppMode } from './types';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);

  const renderContent = () => {
    switch (currentMode) {
      case AppMode.CHAT:
        return <ChatInterface />;
      case AppMode.LIVE:
        return <LiveInterface />;
      case AppMode.CREATION:
        return <CreativeStudio />;
      case AppMode.AUDIO_LAB:
        return <AudioLab />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar currentMode={currentMode} setMode={setCurrentMode} />
      <main className="flex-1 flex flex-col h-full relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;

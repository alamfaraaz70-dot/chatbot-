
import React, { useState } from 'react';
import Header from './components/Header';
import ChatMode from './components/ChatMode';
import VoiceMode from './components/VoiceMode';
import { InteractionMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.TEXT);
  const [isRecording, setIsRecording] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null);

  const handleSignIn = () => {
    // Simulated Google Sign In
    setUser({
      name: "Alex Neural",
      email: "alex.neural@example.com",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
    });
  };

  const handleSignOut = () => {
    setUser(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Header 
        mode={mode} 
        setMode={setMode} 
        isRecording={isRecording} 
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      
      {/* min-h-0 is the secret to nested flex scrollbars */}
      <main className="flex-1 relative min-h-0 overflow-hidden">
        {mode === InteractionMode.TEXT ? (
          <ChatMode />
        ) : (
          <div className="h-full flex items-center justify-center">
             <VoiceMode setIsRecording={setIsRecording} />
          </div>
        )}
      </main>

      {/* Decorative background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .overflow-wrap-anywhere {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

export default App;

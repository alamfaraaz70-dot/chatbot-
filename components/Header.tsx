
import React from 'react';
import { InteractionMode } from '../types';

interface User {
  name: string;
  email: string;
  avatar: string;
}

interface HeaderProps {
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  isRecording?: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode, isRecording, user, onSignIn, onSignOut }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-start glass-morphism border-b border-white/10 shadow-2xl">
      <div className="flex items-center gap-4 pt-1">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10 shadow-xl">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Gemini <span className="text-blue-400">Cognitive</span></h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Pro Reasoning Engine v3.0</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-3">
        {/* Mode Switcher */}
        <div className="flex gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => setMode(InteractionMode.TEXT)}
            className={`px-5 py-2.5 rounded-lg transition-all duration-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
              mode === InteractionMode.TEXT 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            Cognitive Text
          </button>
          <button
            onClick={() => setMode(InteractionMode.VOICE)}
            className={`px-5 py-2.5 rounded-lg transition-all duration-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
              mode === InteractionMode.VOICE 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="relative">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isRecording && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full pulsing"></span>}
            </div>
            Natural Voice
          </button>
        </div>

        {/* Sign In Option - Positioned exactly below Natural Voice */}
        <div className="mr-1">
          {!user ? (
            <button
              onClick={onSignIn}
              className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 group shadow-lg"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest group-hover:text-white">Sign in with Google</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-xl">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">{user.name}</span>
                <button 
                  onClick={onSignOut}
                  className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 p-[1px]">
                <img src={user.avatar} alt="Profile" className="w-full h-full rounded-lg object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

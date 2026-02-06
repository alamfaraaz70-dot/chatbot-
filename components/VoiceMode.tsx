
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../services/audioUtils';
import { VOICE_MODELS, SYSTEM_INSTRUCTION, DEFAULT_VOICE } from '../constants';

const VoiceMode: React.FC<{ setIsRecording: (rec: boolean) => void }> = ({ setIsRecording }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rms, setRms] = useState(0); // Real-time audio meter for visual feedback

  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input?: AudioContext; output?: AudioContext }>({});
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      // Assuming session might have a close method
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setIsRecording(false);
    setStatus('idle');
  }, [setIsRecording]);

  const startVoiceSession = async () => {
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: VOICE_MODELS.LIVE,
        callbacks: {
          onopen: () => {
            console.debug('Live session opened');
            setStatus('active');
            setIsRecording(true);

            // Audio processing setup
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              
              // Simple RMS calculation for visualization
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              setRms(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio output
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputCtx) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            // Transcription
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => prev + message.serverContent?.outputTranscription?.text);
            } else if (message.serverContent?.turnComplete) {
              // Optionally clear transcription or mark end of turn
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error('Live error:', e);
            setStatus('error');
            cleanup();
          },
          onclose: () => {
            console.debug('Live closed');
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          outputAudioTranscription: {},
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start voice session:", err);
      setStatus('error');
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const scale = 1 + rms * 5;

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center space-y-12 animate-in fade-in duration-500">
      <div className="relative">
        {/* Animated rings */}
        <div 
          className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"
          style={{ transform: `scale(${scale * 1.5})`, display: status === 'active' ? 'block' : 'none' }}
        ></div>
        <div 
          className={`w-48 h-48 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-2xl transition-transform duration-75 relative z-10`}
          style={{ transform: `scale(${scale})` }}
        >
          <div className="w-40 h-40 rounded-full bg-slate-900 flex items-center justify-center">
            {isSpeaking ? (
              <div className="flex items-end gap-1 h-12">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 bg-blue-400 rounded-full animate-wave"
                    style={{ 
                      height: `${20 + Math.random() * 80}%`,
                      animationDelay: `${i * 0.1}s` 
                    }}
                  ></div>
                ))}
              </div>
            ) : (
              <svg className={`w-16 h-16 ${status === 'active' ? 'text-purple-400' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 max-w-lg">
        <h2 className="text-3xl font-bold">
          {status === 'idle' && "Ready to talk?"}
          {status === 'connecting' && "Connecting to Gemini..."}
          {status === 'active' && (isSpeaking ? "Gemini is speaking..." : "I'm listening...")}
          {status === 'error' && "Oops! Connection failed."}
        </h2>
        
        <p className="text-gray-400 text-lg">
          {status === 'idle' && "Click the button below to start a natural, real-time conversation."}
          {status === 'connecting' && "Please wait while we establish a secure connection."}
          {status === 'active' && (transcription || "Just say 'Hello' to begin.")}
          {status === 'error' && "Please check your microphone permissions and try again."}
        </p>
      </div>

      <div className="flex gap-4">
        {status === 'idle' ? (
          <button
            onClick={startVoiceSession}
            className="px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-lg shadow-xl shadow-purple-900/40 transition-all hover:scale-105 active:scale-95"
          >
            Start Conversation
          </button>
        ) : (
          <button
            onClick={cleanup}
            className="px-10 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95 border border-white/10"
          >
            {status === 'error' ? 'Retry' : 'End Call'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 20%; }
          50% { height: 100%; }
        }
        .animate-wave {
          animation: wave 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VoiceMode;


import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Message } from '../types';
import { generateCognitiveResponse, generateImage } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

type AlgorithmStage = 'IDLE' | 'LISTENING' | 'UNDERSTANDING' | 'THINKING' | 'SYNTHESIZING' | 'REPLYING' | 'SCANNING';

interface Attachment {
  name: string;
  data: string; // base64
  mimeType: string;
  type: 'image' | 'file';
}

interface MessageWithMetadata extends Message {
  sources?: any[];
  generatedImageUrl?: string;
}

const ChatMode: React.FC = () => {
  const [messages, setMessages] = useState<MessageWithMetadata[]>([
    {
      id: '1',
      role: 'model',
      text: "Neural networks synchronized. I'm ready to perform deep research, compare product prices across the web, or analyze scans. How can I assist you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<AlgorithmStage>('IDLE');
  const [insights, setInsights] = useState<string[]>(["Core Reasoning Online", "Deep Research Module Loaded", "Price Engine Ready"]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [useDeepSearch, setUseDeepSearch] = useState(false);
  const [useCompareMode, setUseCompareMode] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isAutoScrolling = useRef(true);

  // Robust scrolling logic
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    isAutoScrolling.current = atBottom;
  };

  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    if (force || isAutoScrolling.current) {
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: force ? 'smooth' : 'auto'
        });
      });
    }
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages, stage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const isImage = file.type.startsWith('image/');
        setAttachments(prev => [...prev, {
          name: file.name,
          data: base64,
          mimeType: file.type,
          type: isImage ? 'image' : 'file'
        }]);
        setInsights(prev => [...prev.slice(-4), `Context added: ${file.name}`]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const triggerImageGen = () => {
    setInput("Generate a beautiful image of: ");
  };

  // Camera Logic
  const openScanner = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraOpen(false);
      setInsights(prev => [...prev, "Failed to access camera"]);
    }
  };

  const closeScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const captureScan = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        const newAttachment: Attachment = {
          name: `Scan_${new Date().getTime()}.jpg`,
          data: base64,
          mimeType: 'image/jpeg',
          type: 'image'
        };

        closeScanner();
        
        // If comparison mode is on, use a specific comparison prompt for the scan
        const scanPrompt = useCompareMode 
          ? "Identify this product and compare its prices across Amazon, Flipkart, Myntra, Meesho and local stores. Find the best current deals."
          : "Identify this object with extreme precision. Provide the brand, manufacturer, specific model name/number, and any technical details or specifications visible. If it's a device or watch, detail its features and historical/market context.";

        handleSend(scanPrompt, [newAttachment]);
      }
    }
  };

  const handleSend = async (forcedInput?: string, forcedAttachments?: Attachment[]) => {
    const textToSend = forcedInput || input;
    const activeAttachments = forcedAttachments || attachments;

    if ((!textToSend.trim() && activeAttachments.length === 0) || stage !== 'IDLE') return;

    const isImageRequest = textToSend.toLowerCase().startsWith("generate") || textToSend.toLowerCase().includes("image of");
    const isScanAnalysis = forcedInput !== undefined;

    setStage(isScanAnalysis ? 'SCANNING' : 'LISTENING');
    
    const userMessage: MessageWithMetadata = {
      id: Date.now().toString(),
      role: 'user',
      text: isScanAnalysis ? (useCompareMode ? "[Product Price Comparison Requested]" : "[Vision Scan Identification Requested]") : textToSend + (activeAttachments.length > 0 ? ` [Attached ${activeAttachments.length} file(s)]` : ''),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = textToSend;
    const currentAttachments = [...activeAttachments];
    setInput('');
    setAttachments([]);
    
    isAutoScrolling.current = true;
    setTimeout(() => scrollToBottom(true), 50);

    setTimeout(async () => {
      setStage('UNDERSTANDING');
      if (useDeepSearch) setInsights(prev => [...prev.slice(-4), "Deep Research Protocol initialized"]);
      if (useCompareMode) setInsights(prev => [...prev.slice(-4), "Scanning e-commerce databases..."]);

      setTimeout(async () => {
        if (isImageRequest && currentInput.length > 10) {
          setStage('SYNTHESIZING');
          try {
            const imageUrl = await generateImage(currentInput);
            if (imageUrl) {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "I've synthesized the visual representation you requested.",
                generatedImageUrl: imageUrl,
                timestamp: new Date()
              }]);
              setStage('IDLE');
              return;
            }
          } catch (e) {
            console.error("Image Gen Error", e);
          }
        }

        setStage('THINKING');
        try {
          const parts: any[] = [{ text: currentInput }];
          currentAttachments.forEach(att => {
            parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } });
          });

          const history = messages.slice(-10).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }));
          history.push({ role: 'user', parts: parts });

          const result = await generateCognitiveResponse(history, useDeepSearch || isScanAnalysis || useCompareMode, useCompareMode);
          
          let fullText = '';
          const modelMessageId = (Date.now() + 1).toString();
          let sources: any[] = [];
          let firstChunk = true;

          for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              const newSources = c.candidates[0].groundingMetadata.groundingChunks
                .filter((chunk: any) => chunk.web)
                .map((chunk: any) => ({ title: chunk.web.title, uri: chunk.web.uri }));
              sources = [...new Set([...sources, ...newSources])];
            }

            if (firstChunk) {
              setStage('REPLYING');
              setMessages(prev => [...prev, {
                id: modelMessageId,
                role: 'model',
                text: '',
                timestamp: new Date(),
                sources: []
              }]);
              firstChunk = false;
            }

            const textChunk = c.text;
            if (textChunk) {
              fullText += textChunk;
              setMessages(prev => prev.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: fullText, sources: sources } : msg
              ));
              scrollToBottom();
            }
          }
        } catch (error) {
          console.error("Cognitive error:", error);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: "My reasoning engine encountered a failure. Please try again.",
            timestamp: new Date()
          }]);
        } finally {
          setStage('IDLE');
        }
      }, 800);
    }, 600);
  };

  const stages: { key: AlgorithmStage; label: string; icon: string; color: string }[] = [
    { key: 'SCANNING', label: 'Scan', icon: '📸', color: 'text-cyan-400' },
    { key: 'LISTENING', label: 'Listen', icon: '👂', color: 'text-blue-400' },
    { key: 'UNDERSTANDING', label: 'Analyze', icon: '🧠', color: 'text-purple-400' },
    { key: 'THINKING', label: 'Think', icon: '⚙️', color: 'text-amber-400' },
    { key: 'SYNTHESIZING', label: 'Synthesize', icon: '🎨', color: 'text-pink-400' },
    { key: 'REPLYING', label: 'Reply', icon: '💬', color: 'text-green-400' },
  ];

  return (
    <div className="flex h-full w-full max-w-[1400px] mx-auto overflow-hidden bg-slate-950/20 backdrop-blur-sm">
      {/* Sidebar HUD */}
      <div className="hidden lg:flex flex-col w-72 border-r border-white/5 bg-slate-900/10 backdrop-blur-2xl pt-24 p-6 space-y-8 h-full shrink-0">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Cognitive Engine Status</h3>
          <div className="space-y-2">
            {stages.map((s) => (
              <div 
                key={s.key} 
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  stage === s.key 
                    ? `bg-slate-800 border-white/20 shadow-lg scale-105 ${s.color}` 
                    : 'bg-transparent border-transparent text-slate-600 opacity-40'
                }`}
              >
                <span className="text-lg">{s.icon}</span>
                <span className="text-[11px] font-black uppercase tracking-widest">{s.label}</span>
                {stage === s.key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
           <div className={`p-4 rounded-2xl border transition-all duration-500 ${useDeepSearch ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-800/20 border-white/5'}`}>
              <div className="flex items-center gap-2 mb-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${useDeepSearch ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></div>
                 <span className={`text-[10px] font-black uppercase tracking-widest ${useDeepSearch ? 'text-blue-400' : 'text-slate-500'}`}>Deep Research</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">Exhaustive multi-pass analysis mode active.</p>
           </div>

           {/* Compare Product Toggle */}
           <div className={`p-4 rounded-2xl border transition-all duration-500 ${useCompareMode ? 'bg-amber-600/10 border-amber-500/30' : 'bg-slate-800/20 border-white/5'}`}>
              <button 
                onClick={() => setUseCompareMode(!useCompareMode)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${useCompareMode ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}></div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${useCompareMode ? 'text-amber-400' : 'text-slate-500'}`}>Compare Product</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Intelligent price comparison assistant across platforms.</p>
              </button>
           </div>
        </div>

        {/* Scan Image Sidebar Button */}
        <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
          <button onClick={openScanner} className="w-full flex items-center justify-between mb-2 group">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Scan Image</span>
            <svg className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <p className="text-[10px] text-slate-500 leading-tight">Use camera to identify brands and models instantly.</p>
        </div>

        <div className="p-4 bg-pink-500/5 border border-pink-500/10 rounded-2xl">
          <button onClick={triggerImageGen} className="w-full flex items-center justify-between mb-2 group">
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Visual Studio</span>
            <svg className="w-4 h-4 text-pink-400 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <p className="text-[10px] text-slate-500 leading-tight">Create original AI artwork from text.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Reasoning Logs</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {insights.map((insight, i) => (
              <div key={i} className="text-[10px] bg-slate-800/50 border border-white/5 p-2.5 rounded-lg text-slate-400 font-mono animate-in slide-in-from-left-2">
                <span className="text-blue-500/50 mr-2">›</span>{insight}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar pt-32 pb-64 px-4 md:px-12 space-y-10 min-h-0"
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
              <div className={`flex flex-col gap-2 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg ${
                    msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800 border border-white/10'
                  }`}>
                    {msg.role === 'user' ? (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                    ) : (
                      <div className="w-2.5 h-2.5 bg-blue-400 rounded-full pulsing"></div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 min-w-0 flex-1">
                    <div className={`p-6 rounded-3xl leading-relaxed text-[15px] ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/10' 
                        : 'bg-slate-800/95 text-gray-100 border border-white/10 rounded-tl-none backdrop-blur-md shadow-2xl'
                    }`}>
                      <p className="whitespace-pre-wrap overflow-wrap-anywhere prose prose-invert prose-sm max-w-none">
                        {msg.text || (stage === 'REPLYING' && msg.id === messages[messages.length-1].id ? '...' : '')}
                      </p>
                    </div>
                    
                    {msg.generatedImageUrl && (
                      <div className="relative group max-w-lg animate-in zoom-in-95 duration-700">
                        <img 
                          src={msg.generatedImageUrl} 
                          className="relative rounded-2xl border border-white/10 shadow-2xl w-full h-auto cursor-pointer"
                          alt="AI Generation"
                          onLoad={() => scrollToBottom(true)}
                          onClick={() => window.open(msg.generatedImageUrl)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 animate-in fade-in">
                    {msg.sources.map((src, i) => (
                      <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" 
                         className="text-[9px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-blue-300 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 font-bold uppercase tracking-wider">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                        {src.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {stage !== 'IDLE' && stage !== 'REPLYING' && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="p-5 bg-slate-800/50 rounded-3xl border border-white/10 flex flex-col gap-3 min-w-[240px] backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${stages.find(s => s.key === stage)?.color}`}>
                      {stage === 'SCANNING' ? 'Vision Scanning...' : useDeepSearch && stage === 'THINKING' ? 'Deep Researching...' : useCompareMode && stage === 'THINKING' ? 'Price Comparison...' : `${stage}...`}
                    </span>
                    <span className="text-xs animate-spin">⚙️</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                    <div className={`h-full bg-current transition-all duration-[2000ms] ${stages.find(s => s.key === stage)?.color}`} 
                         style={{ width: stage === 'SCANNING' ? '30%' : stage === 'LISTENING' ? '20%' : stage === 'UNDERSTANDING' ? '40%' : stage === 'THINKING' ? '75%' : '95%' }}></div>
                  </div>
                  {(useDeepSearch || stage === 'SCANNING' || useCompareMode) && stage === 'THINKING' && (
                    <span className="text-[9px] text-slate-500 animate-pulse font-mono italic">
                      {stage === 'SCANNING' ? 'Running visual model identification...' : useCompareMode ? 'Searching e-commerce apps for the best deals...' : 'Aggregating intelligence sources...'}
                    </span>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* Camera Overlay */}
        {isCameraOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={closeScanner}></div>
             <div className="relative w-full max-w-2xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Scanning Animation Line */}
                <div className="absolute inset-x-0 h-1 bg-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 animate-[scan_2s_ease-in-out_infinite]"></div>

                <div className="absolute inset-0 flex flex-col justify-between p-6 z-20">
                   <div className="flex justify-between items-start">
                      <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Precision Vision Scanner</span>
                      </div>
                      <button onClick={closeScanner} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </div>
                   
                   <div className="flex flex-col items-center gap-4 pb-4">
                      <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">Align object within frame for best results</p>
                      <button 
                        onClick={captureScan}
                        className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 active:scale-90 transition-all flex items-center justify-center shadow-2xl"
                      >
                         <div className="w-12 h-12 rounded-full bg-white"></div>
                      </button>
                   </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
             </div>
          </div>
        )}

        {/* Input Dock */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-50">
          <div className="max-w-4xl mx-auto glass-morphism rounded-[32px] p-4 md:p-6 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] border border-white/10">
            <div className="space-y-4">
              
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 pb-2 animate-in slide-in-from-bottom-2">
                  {attachments.map((att, i) => (
                    <div key={i} className="relative group">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/80 border border-white/10 rounded-2xl pr-8">
                        {att.type === 'image' ? (
                          <img src={`data:${att.mimeType};base64,${att.data}`} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-slate-300 truncate max-w-[100px]">{att.name}</span>
                      </div>
                      <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-sm shadow-xl transition-all">×</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt" />
                
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-400 hover:text-blue-400 transition-all" title="Upload files">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  {/* Moble Scan Button in Input bar */}
                  <button onClick={openScanner} className="lg:hidden p-4 bg-white/5 rounded-2xl border border-white/5 text-cyan-400" title="Scan Image">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                </div>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={useCompareMode ? "Paste product name/URL to compare prices..." : useDeepSearch ? "Ask for a deep research analysis..." : "Ask me anything..."}
                    disabled={stage !== 'IDLE'}
                    className={`w-full bg-slate-950/50 border rounded-2xl px-6 py-4.5 text-white focus:outline-none transition-all text-sm shadow-inner ${useCompareMode ? 'border-amber-500/40 focus:border-amber-500' : useDeepSearch ? 'border-blue-500/40 focus:border-blue-500' : 'border-white/10 focus:border-blue-500/50'}`}
                  />
                  {(useDeepSearch || useCompareMode) && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${useCompareMode ? 'bg-amber-400/10 text-amber-400' : 'bg-blue-400/10 text-blue-400'}`}>
                          {useCompareMode ? 'Comparison Mode Active' : 'Deep Research Active'}
                       </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setUseCompareMode(false); setUseDeepSearch(!useDeepSearch); }} 
                    className={`p-4 rounded-2xl border transition-all ${useDeepSearch ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`} 
                    title="Toggle Deep Research"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>
                  <button onClick={() => handleSend()} disabled={(!input.trim() && attachments.length === 0) || stage !== 'IDLE'} className={`p-4 rounded-2xl transition-all ${(!input.trim() && attachments.length === 0) || stage !== 'IDLE' ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 hover:bg-blue-500 active:scale-95'}`}>
                    <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ChatMode;

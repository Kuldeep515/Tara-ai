```react
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, User, Sparkles, Loader2, Bot, Trash2, Globe, Image as ImageIcon, 
  Menu, Plus, Copy, Edit2, Check, Search, FileText, X, Download, Clock, Mic, Volume2, Pause, Settings2, Music, ChevronDown, AlertTriangle, ListTodo, BrainCircuit, CheckCircle2, XCircle, RotateCcw
} from 'lucide-react';

// --- Global Settings ---
const apiKey = ""; // API key automatically provided

// --- Utility: Download Helper ---
const forceDownload = async (fileUrl, fileName) => {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      const a = document.createElement("a");
      a.href = reader.result;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
  } catch (e) {
    window.open(fileUrl, '_blank');
  }
};

// --- Voice Data ---
const VOICE_MAP = {
  'Kore': { id: 'Kore', name: 'Priya', desc: 'Professional Female' },
  'Orus': { id: 'Orus', name: 'Rohan', desc: 'Solid Male Voice' },
  'Leda': { id: 'Leda', name: 'Neha', desc: 'Clear & Fast' },
  'Puck': { id: 'Puck', name: 'Banti', desc: 'Child-like' },
  'Iapetus': { id: 'Iapetus', name: 'Dada ji', desc: 'Elderly Male' },
  'Fenrir': { id: 'Fenrir', name: 'Kabir', desc: 'Deep Male' }
};

// --- Sub-Component: Quiz Card ---
const QuizCard = ({ q, idx }) => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4 animate-in fade-in slide-in-from-bottom-2">
      <h4 className="font-semibold text-slate-800 mb-4 flex gap-2">
        <span className="text-purple-600">Q{idx + 1}.</span> {q.question}
      </h4>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let styles = "bg-slate-50 border-slate-200 hover:bg-slate-100";
          let statusIcon = <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />;

          if (selected !== null) {
            if (i === q.correctAnswerIndex) {
              styles = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500/20";
              statusIcon = <CheckCircle2 size={20} className="text-green-600" />;
            } else if (i === selected) {
              styles = "bg-red-50 border-red-400 text-red-800";
              statusIcon = <XCircle size={20} className="text-red-500" />;
            } else {
              styles = "bg-slate-50 border-slate-100 opacity-50";
            }
          }

          return (
            <button 
              key={i} 
              disabled={selected !== null} 
              onClick={() => setSelected(i)} 
              className={`w-full text-left p-4 border rounded-xl flex items-center gap-3 transition-all duration-200 ${styles}`}
            >
              {statusIcon} <span className="text-sm font-medium">{opt}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900 leading-relaxed animate-in fade-in">
          <span className="font-bold flex items-center gap-1 mb-1 text-blue-700">
            <Sparkles size={14}/> Explanation:
          </span>
          {q.explanation}
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [sessions, setSessions] = useState([{ id: Date.now(), title: 'New Chat', messages: [] }]);
  const [currentSessionId, setCurrentSessionId] = useState(sessions[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(null); 
  const [showTools, setShowTools] = useState(false);
  const [userMemory, setUserMemory] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [quizConfig, setQuizConfig] = useState({ count: 5, level: 'Medium' });

  const chatEndRef = useRef(null);
  const toolsRef = useRef(null);

  const currentMessages = sessions.find(s => s.id === currentSessionId)?.messages || [];

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentMessages, isLoading]);

  // Click outside to close tools menu
  useEffect(() => {
    const handleOutside = (e) => { if (toolsRef.current && !toolsRef.current.contains(e.target)) setShowTools(false); };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const updateMessages = (updater) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const newMsgs = typeof updater === 'function' ? updater(s.messages) : updater;
        let newTitle = s.title;
        if (s.title === 'New Chat' && newMsgs.length > 0) {
          const firstUser = newMsgs.find(m => m.role === 'user');
          if (firstUser) newTitle = firstUser.content.slice(0, 20) + '...';
        }
        return { ...s, messages: newMsgs, title: newTitle };
      }
      return s;
    }));
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    let finalPrompt = userText;
    const currentMode = activeMode;

    if (currentMode === 'image') finalPrompt = `[GENERATE_IMAGE: ${userText}]`;
    if (currentMode === 'quiz') finalPrompt = `Create a quiz about ${userText}. Qs: ${quizConfig.count}, Difficulty: ${quizConfig.level}. Respond ONLY with a valid JSON array wrapped in \`\`\`json containing objects with "question", "options" (4), "correctAnswerIndex", and "explanation".`;

    updateMessages(prev => [...prev, { role: 'user', content: userText, mode: currentMode }]);
    setInput(''); setActiveMode(null); setShowTools(false);
    setIsLoading(true);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [...currentMessages, { role: 'user', parts: [{ text: finalPrompt }] }].map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          systemInstruction: { parts: [{ text: `Tumhara naam Tara AI hai. User memory: ${userMemory.join(', ')}. Image ke liye [GENERATE_IMAGE: prompt] ka use karo. Memory ke liye [MEMORY: fact] tag lagao.` }] }
        })
      });

      const data = await response.json();
      let modelText = data.candidates[0].content.parts[0].text;

      // Memory Parsing
      const memoryMatch = modelText.match(/\[MEMORY:\s*(.*?)\]/i);
      if (memoryMatch) {
        setUserMemory(prev => [...prev, memoryMatch[1]]);
        modelText = modelText.replace(/\[MEMORY:\s*(.*?)\]/i, '').trim();
      }

      // Image Logic
      if (modelText.includes('[GENERATE_IMAGE:')) {
        const prompt = modelText.match(/\[GENERATE_IMAGE:\s*(.*?)\]/i)[1];
        const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instances: { prompt }, parameters: { sampleCount: 1 } })
        });
        const imgData = await imgRes.json();
        updateMessages(prev => [...prev, { role: 'model', content: 'Lijiye, aapki image:', imageUrl: `data:image/png;base64,${imgData.predictions[0].bytesBase64Encoded}` }]);
      } 
      // Audio Logic
      else if (currentMode === 'audio') {
        const ttsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: modelText.replace(/[*_#]/g, '') }] }],
            generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } } }
          })
        });
        const ttsData = await ttsRes.json();
        updateMessages(prev => [...prev, { role: 'model', content: modelText, audioUrl: `data:audio/wav;base64,${ttsData.candidates[0].content.parts[0].inlineData.data}` }]);
      }
      // Quiz Logic
      else if (currentMode === 'quiz') {
        const jsonMatch = modelText.match(/```json\n?([\s\S]*?)\n?```/i);
        if (jsonMatch) {
          updateMessages(prev => [...prev, { role: 'model', content: 'Taiyar ho jaiye Quiz ke liye!', quizData: JSON.parse(jsonMatch[1]) }]);
        } else {
          updateMessages(prev => [...prev, { role: 'model', content: modelText }]);
        }
      } 
      // Default
      else {
        updateMessages(prev => [...prev, { role: 'model', content: modelText }]);
      }
    } catch (e) {
      updateMessages(prev => [...prev, { role: 'model', content: 'Maaf kijiye, error aa gaya.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`fixed md:relative z-50 h-full w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <button onClick={() => { setSessions([{ id: Date.now(), title: 'New Chat', messages: [] }, ...sessions]); setSidebarOpen(false); }} className="flex-1 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all text-sm font-medium">
            <Plus size={18} /> New Chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-2 p-2 text-slate-400"><X size={20} /></button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Voice Profile</label>
            <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20">
              {Object.values(VOICE_MAP).map(v => <option key={v.id} value={v.id}>{v.name} ({v.desc})</option>)}
            </select>
          </div>

          <button onClick={() => setShowMemoryModal(true)} className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors shadow-sm">
            <span className="flex items-center gap-2"><BrainCircuit size={16}/> Tara's Memory</span>
            <span className="bg-blue-200 px-1.5 py-0.5 rounded-md text-[10px]">{userMemory.length}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-3 mb-2 block">History</label>
          {sessions.map(s => (
            <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setSidebarOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-all mb-1 ${currentSessionId === s.id ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <span className="text-xs font-semibold truncate flex-1 pr-2">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); setSessions(prev => prev.filter(x => x.id !== s.id)); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative z-10 shadow-2xl">
        <header className="px-4 py-3 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-100"><Sparkles size={18} /></div>
            <div><h1 className="font-bold text-slate-900 tracking-tight leading-none">Tara AI</h1><p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mt-1">Smart Engine</p></div>
          </div>
          <button onClick={() => updateMessages([])} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Clear Chat"><RotateCcw size={18} /></button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar bg-slate-50/30">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-tr from-purple-50 to-pink-50 flex items-center justify-center mb-6 border border-purple-100 shadow-inner"><Sparkles size={48} className="text-purple-400" /></div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Namaste.</h2>
              <p className="text-slate-500 max-w-sm text-sm">Main Tara hoon. Aaj main aapki kaise madad kar sakti hoon?</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              {currentMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[90%] md:max-w-[80%] ${m.quizData ? 'w-full' : ''}`}>
                    <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : m.quizData ? 'p-0 shadow-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                      {m.quizData ? (
                        <div className="grid grid-cols-1 gap-4">{m.quizData.map((q, qidx) => <QuizCard key={qidx} q={q} idx={qidx} />)}</div>
                      ) : (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      )}
                      
                      {m.imageUrl && (
                        <div className="mt-3 relative group overflow-hidden rounded-xl border border-slate-100 shadow-md">
                          <img src={m.imageUrl} className="w-full" alt="AI Generated" />
                          <button onClick={() => forceDownload(m.imageUrl, 'tara_ai_image.png')} className="absolute top-3 right-3 bg-black/60 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm shadow-xl hover:scale-110"><Download size={18}/></button>
                        </div>
                      )}

                      {m.audioUrl && (
                        <div className="mt-4 bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4 shadow-inner">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Music size={20} /></div>
                          <audio src={m.audioUrl} controls className="h-8 flex-1" />
                          <button onClick={() => forceDownload(m.audioUrl, 'tara_audio.wav')} className="p-2.5 text-orange-600 hover:bg-orange-100 rounded-full transition-all border border-orange-200"><Download size={16} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-sm">
                    <Loader2 size={16} className="text-purple-500 animate-spin" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thinking</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </main>

        <footer className="p-4 md:p-6 bg-white border-t">
          <div className="max-w-4xl mx-auto">
            {activeMode && (
              <div className="mb-3 flex flex-wrap items-center gap-2 animate-in slide-in-from-bottom-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border shadow-sm uppercase ${activeMode === 'image' ? 'bg-purple-50 text-purple-700 border-purple-200' : activeMode === 'audio' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                  {activeMode} Mode <X size={12} className="cursor-pointer ml-1" onClick={() => setActiveMode(null)}/>
                </span>
                {activeMode === 'quiz' && (
                  <div className="flex gap-2">
                    <select value={quizConfig.count} onChange={e => setQuizConfig({...quizConfig, count: e.target.value})} className="bg-slate-50 border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg outline-none"><option value="5">5 Qs</option><option value="10">10 Qs</option><option value="20">20 Qs</option></select>
                    <select value={quizConfig.level} onChange={e => setQuizConfig({...quizConfig, level: e.target.value})} className="bg-slate-50 border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg outline-none"><option>Easy</option><option>Medium</option><option>Hard</option></select>
                  </div>
                )}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-slate-100 p-2 pl-3 rounded-[2rem] border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all shadow-sm">
              <div className="relative" ref={toolsRef}>
                <button onClick={() => setShowTools(!showTools)} className={`p-2.5 rounded-full transition-all flex-shrink-0 mb-0.5 ${showTools ? 'bg-slate-900 text-white rotate-45' : 'text-slate-400 hover:bg-slate-200'}`}><Plus size={22} /></button>
                {showTools && (
                  <div className="absolute bottom-full left-0 mb-4 w-60 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl p-2 z-[99] animate-in fade-in slide-in-from-bottom-2 origin-bottom-left">
                    <button onClick={() => { setActiveMode('image'); setShowTools(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 rounded-xl text-sm font-semibold transition-all text-slate-700 text-left"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><ImageIcon size={16}/></div> Generate Image</button>
                    <button onClick={() => { setActiveMode('audio'); setShowTools(false); }} c

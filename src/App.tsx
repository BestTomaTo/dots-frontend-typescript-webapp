import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, ReactNode, useRef } from "react";
import { Sparkles, Map, BookOpen, FlaskConical, Languages, Sun, Moon, Plus, X, Send, Loader2, Trash2, GripVertical } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Language = 'ko' | 'en';

const translations = {
  ko: {
    logo: "DOTS.",
    constellation: "나의 도화지",
    diary: "경험 기록",
    future: "브릿지 리포트",
    growth: "탐험 큐레이션",
    logged: "기록된 경험들",
    branching: "지식 브릿지",
    hero: "경험 속 <br /><span className='font-bold text-purple-600 dark:text-purple-400'>항로 찾기.</span>",
    since: "당신의 흔적을 잇는 중",
    predictionTitle: "AI 브릿지 추천",
    predictionDesc: "두 점을 연결하여 새로운 성장을 발견하세요.",
    explore: "추천 활동 보기",
    uncertainty: "항로 가이드",
    variance: "캔버스를 클릭해 점을 찍으세요",
    dataThinness: "두 점을 선택해 연결해보세요",
    warning: "AI 안내: 연결된 경험 분석 중",
    missing: "! 새로운 연결 가능성 발견",
    addTitle: "경험의 점 찍기",
    placeholder: "이 위치에 어떤 소중한 경험을 남기시겠어요?",
    saving: "AI가 경험을 분석하고 있습니다...",
    save: "기록하기",
    close: "닫기",
    edit: "편집",
    delete: "삭제",
    color: "색상",
    width: "굵기",
    curvature: "곡률",
    moveHint: "점을 드래그하여 위치를 옮겨보세요",
    reportTitle: "연결의 키워드",
    curationTitle: "데이터 기반 큐레이션",
    bridgeAsk: "두 경험을 이어 브릿지 리포트를 생성하시겠습니까?",
    approve: "승인",
    reject: "거절",
    curateBtn: "이 키워드로 큐레이션하기",
    solid: "실선",
    dashed: "점선"
  },
  en: {
    logo: "DOTS.",
    constellation: "My Canvas",
    diary: "Diary Entry",
    future: "Bridge Report",
    growth: "Discovery Curator",
    logged: "Points of Light",
    branching: "Knowledge Bridge",
    hero: "Finding the path <br /><span className='font-bold text-purple-600 dark:text-purple-400'>in experience.</span>",
    since: "Tracing your trajectory",
    predictionTitle: "AI Bridge",
    predictionDesc: "Generating bridge keywords...",
    explore: "View Report",
    uncertainty: "Path Guide",
    variance: "Click canvas to add a dot",
    dataThinness: "Select two dots to connect",
    warning: "AI Notice: Analyzing connected narrative",
    missing: "! New connection potential found",
    addTitle: "Dotting an Experience",
    placeholder: "What experience do you want to place here?",
    saving: "AI is analyzing your record...",
    save: "Record",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    color: "Color",
    width: "Width",
    curvature: "Curvature",
    moveHint: "Drag dots to reposition",
    reportTitle: "Bridge Keywords",
    curationTitle: "Data-Driven Curation",
    bridgeAsk: "Create a Bridge Report for this connection?",
    approve: "Approve",
    reject: "Reject",
    curateBtn: "Curate with these keywords",
    solid: "Solid",
    dashed: "Dashed"
  }
};

interface Dot {
  id: string;
  label: string;
  content: string;
  top: string;
  left: string;
  group: 'tech' | 'art' | 'life' | 'social';
  timestamp: number;
  color?: string;
}

interface Connection {
  from: string;
  to: string;
  width: number;
  curvature: number;
  dashed?: boolean;
}

export default function App() {
  const [lang, setLang] = useState<Language>('ko');
  const [isDark, setIsDark] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'canvas' | 'report' | 'curation'>('canvas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<{ x: string, y: string } | null>(null);
  const [selectedDots, setSelectedDots] = useState<string[]>([]);
  const [editingDotId, setEditingDotId] = useState<string | null>(null);
  const [editingConnIdx, setEditingConnIdx] = useState<number | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [bridgeReports, setBridgeReports] = useState<{id: string, title: string, keywords: string[], date: number}[]>([]);
  const [showBridgePrompt, setShowBridgePrompt] = useState(false);
  const [pendingBridge, setPendingBridge] = useState<{ d1: Dot, d2: Dot } | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dots, setDots] = useState<Dot[]>([
    { id: '1', label: "Coding Bootcamp", content: "Started learning React and Node.js", top: "25%", left: "25%", group: 'tech', timestamp: Date.now() - 10000000, color: '#A855F7' },
    { id: '2', label: "Art Exhibition", content: "Inspired by abstract expressionism", top: "65%", left: "65%", group: 'art', timestamp: Date.now() - 5000000, color: '#D97706' },
  ]);
  const [prediction, setPrediction] = useState("");
  const [curationResult, setCurationResult] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const handleCanvasClick = (e: React.MouseEvent | any) => {
    if (e.target !== e.currentTarget) return;
    if (mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingCoords({ x: `${x.toFixed(2)}%`, y: `${y.toFixed(2)}%` });
      setIsModalOpen(true);
    }
  };

  const handleDotClick = async (dotId: string) => {
    setEditingConnIdx(null);
    if (editingDotId === dotId) {
      setEditingDotId(null);
      return;
    }

    if (selectedDots.includes(dotId)) {
      setSelectedDots(selectedDots.filter(id => id !== dotId));
      return;
    }
    
    if (selectedDots.length === 1) {
      const firstDot = dots.find(d => d.id === selectedDots[0]);
      const secondDot = dots.find(d => d.id === dotId);
      
      if (firstDot && secondDot) {
        // Instant visual feedback for line
        setConnections(prev => [...prev, { from: firstDot.id, to: secondDot.id, width: 2, curvature: 0, dashed: false }]);
        setSelectedDots([]);
        setPendingBridge({ d1: firstDot, d2: secondDot });
        // Slight delay for the prompt to ensure the line is noticed first
        setTimeout(() => setShowBridgePrompt(true), 300);
      }
    } else {
      setSelectedDots([dotId]);
      setEditingDotId(dotId);
    }
  };

  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => setIsDragging(false);

  const handleDrag = (dotId: string, info: any) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    
    setDots(prevDots => prevDots.map(d => {
      if (d.id !== dotId) return d;
      
      const currentX = (parseFloat(d.left) / 100) * rect.width;
      const currentY = (parseFloat(d.top) / 100) * rect.height;
      
      // Using delta for incremental updates during drag
      const newX = ((currentX + info.delta.x) / rect.width) * 100;
      const newY = ((currentY + info.delta.y) / rect.height) * 100;
      
      return {
        ...d,
        left: `${Math.max(0, Math.min(100, newX)).toFixed(2)}%`,
        top: `${Math.max(0, Math.min(100, newY)).toFixed(2)}%`
      };
    }));
  };

  const deleteDot = (id: string) => {
    setDots(dots.filter(d => d.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    setEditingDotId(null);
  };

  const updateDotColor = (id: string, color: string) => {
    setDots(dots.map(d => d.id === id ? { ...d, color } : d));
  };

  const deleteConnection = (index: number) => {
    setConnections(connections.filter((_, i) => i !== index));
    setEditingConnIdx(null);
  };

  const bridgeExperiences = async (d1: Dot, d2: Dot) => {
    setIsAnalyzing(true);
    try {
      const prompt = `Two life experiences: "${d1.label}: ${d1.content}" and "${d2.label}: ${d2.content}". 
      Think of these two together. Recommend EXACTLY 5 representative keywords that bridge these two experiences.
      Format: keyword1, keyword2, keyword3, keyword4, keyword5
      Language: ${lang === 'ko' ? 'Korean' : 'English'}.
      RULE: Return ONLY the 5 keywords separated by commas. No other text.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const result = response.text || "";
      const keywords = result.split(',').map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
      
      setBridgeReports(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        title: `${d1.label} ↔ ${d2.label}`,
        keywords,
        date: Date.now()
      }, ...prev]);
    } catch (e) {
      console.error("Bridge failed:", e);
    } finally {
      setIsAnalyzing(false);
      setShowBridgePrompt(false);
      setPendingBridge(null);
    }
  };

  const deleteReport = (id: string) => {
    setBridgeReports(prev => prev.filter(r => r.id !== id));
  };

  const updateKeyword = (reportId: string, kwIndex: number, newValue: string) => {
    setBridgeReports(prev => prev.map(r => r.id === reportId ? {
      ...r,
      keywords: r.keywords.map((kw, i) => i === kwIndex ? newValue : kw)
    } : r));
  };

  const deleteKeyword = (reportId: string, kwIndex: number) => {
    setBridgeReports(prev => prev.map(r => r.id === reportId ? {
      ...r,
      keywords: r.keywords.filter((_, i) => i !== kwIndex)
    } : r));
  };

  const handleApproveBridge = () => {
    if (pendingBridge) {
      bridgeExperiences(pendingBridge.d1, pendingBridge.d2);
    }
  };

  const handleRejectBridge = () => {
    setShowBridgePrompt(false);
    setPendingBridge(null);
  };

  const suggestCurationWithKeywords = async (keywords: string[]) => {
    setActiveMenu('curation');
    setCurationResult("키워드를 기반으로 맞춤형 큐레이션을 생성하는 중...");
    try {
      const prompt = `Based on these keywords: ${keywords.join(", ")}, recommend 3 specific real-world explorations:
      1. One industry fair or exhibition.
      2. One cultural experience.
      3. One book or documentary.
      Search the web for current events.
      Language: ${lang === 'ko' ? 'Korean' : 'English'}.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });
      setCurationResult(response.text || "");
    } catch (e) {
      console.error("Curation failed:", e);
    }
  };

  const suggestCuration = async () => {
    setActiveMenu('curation');
    setCurationResult("전체 도화지를 분석하여 새로운 탐험 큐레이션을 생성하는 중...");
    try {
      const prompt = `Look at ALL my life experiences: ${dots.map(d => `[${d.label}: ${d.content}]`).join(", ")}.
      Analyze my life's trajectory. What is MISSING? 
      Recommend 3 distinct real-world explorations:
      1. One major industry fair or exhibition related to their clusters.
      2. One specific local or global cultural experience.
      3. One specific professional book or documentary.
      Search the web for real current events or entities.
      Language: ${lang === 'ko' ? 'Korean' : 'English'}. Be bold and forward-looking.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });
      setCurationResult(response.text || "");
    } catch (e) {
      console.error("Curation failed:", e);
      setCurationResult("큐레이션 생성에 실패했습니다.");
    }
  };

  const handleAddDot = async () => {
    if (!newEntry.trim() || !pendingCoords) return;
    setIsAnalyzing(true);

    try {
      const prompt = `Analyze this diary entry: "${newEntry}". Give it a short 2-3 word title and assign it to one of these groups: 'tech', 'art', 'life', 'social'. Return ONLY JSON: {"title": "Title", "group": "group_name"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const cleanedText = response.text?.replace(/```json|```/g, "").trim() || "{}";
      const data = JSON.parse(cleanedText);
      
      const newDot: Dot = {
        id: Math.random().toString(36).substr(2, 9),
        label: data.title || "New Experience",
        content: newEntry,
        top: pendingCoords.y,
        left: pendingCoords.x,
        group: (data.group as any) || 'life',
        timestamp: Date.now()
      };

      setDots([...dots, newDot]);
      setNewEntry("");
      setIsModalOpen(false);
      setPendingCoords(null);
    } catch (e) {
      console.error("AI Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[var(--color-dots-bg)] text-[var(--color-dots-text)] overflow-hidden font-sans transition-all">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-dots-aside)] border-r border-[var(--color-dots-border)] p-10 flex flex-col justify-between shrink-0 transition-all">
        <div className="space-y-12">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-black tracking-tighter text-purple-600 dark:text-purple-400">{t.logo}</div>
            <div className="flex gap-2">
              <button onClick={() => setLang(l => l === 'ko' ? 'en' : 'ko')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer">
                <Languages size={16} className="opacity-60" />
              </button>
              <button onClick={() => setIsDark(!isDark)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer">
                {isDark ? <Sun size={16} className="opacity-60" /> : <Moon size={16} className="opacity-60" />}
              </button>
            </div>
          </div>
          
          <nav className="space-y-4">
            <button onClick={() => setActiveMenu('canvas')} className="w-full text-left">
              <NavItem icon={<Map size={18} />} label={t.constellation} active={activeMenu === 'canvas'} />
            </button>
            <button onClick={() => setIsModalOpen(true)} className="w-full text-left">
              <NavItem icon={<Plus size={18} />} label={t.diary} />
            </button>
            <button onClick={() => setActiveMenu('report')} className="w-full text-left">
              <NavItem icon={<BookOpen size={18} />} label={t.future} active={activeMenu === 'report'} />
            </button>
            <button onClick={suggestCuration} className="w-full text-left">
              <NavItem icon={<FlaskConical size={18} />} label={t.growth} active={activeMenu === 'curation'} />
            </button>
          </nav>
        </div>

        <div className="space-y-6 pt-10 border-t border-[var(--color-dots-border)]">
          <Stat label={t.logged} value={`${dots.length} Points`} />
          <Stat label={t.branching} value={(dots.length * 0.8).toFixed(1)} color="var(--color-dots-accent)" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeMenu === 'canvas' ? (
          <div ref={mainRef} onClick={handleCanvasClick} className="flex-1 relative overflow-hidden cursor-crosshair bg-[var(--color-dots-bg)] group/canvas">
            {/* Background Guide Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover/canvas:opacity-20 transition-opacity">
              <p className="text-2xl font-light tracking-widest uppercase">{t.variance}</p>
            </div>
            {/* Connection Lines (SVG) */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {connections.map((conn, i) => {
                const fromDot = dots.find(d => d.id === conn.from);
                const toDot = dots.find(d => d.id === conn.to);

                if (!fromDot || !toDot) return null;

                const x1 = parseFloat(fromDot.left), y1 = parseFloat(fromDot.top);
                const x2 = parseFloat(toDot.left), y2 = parseFloat(toDot.top);
                const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
                const dx = x2 - x1, dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1; // 0으로 나누기 방지
                const nx = -dy / dist, ny = dx / dist;
                const cpX = midX + nx * (conn.curvature || 0) * 5;
                const cpY = midY + ny * (conn.curvature || 0) * 5;

                // 현재 선택된 선인지 확인
                const isEditing = editingConnIdx === i;

                return (
                  <g 
                    key={`conn-group-${i}`} 
                    className="pointer-events-auto cursor-pointer" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingConnIdx(i); 
                      setEditingDotId(null); 
                    }}
                  >
                    <path 
                      d={`M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`} 
                      stroke={fromDot.color || 'var(--color-dots-accent)'} 
                      strokeWidth={conn.width || 2} 
                      strokeLinecap="round"
                      fill="none" 
                      vectorEffect="non-scaling-stroke"
                      /* 점선 완전 제거: strokeDasharray를 아예 쓰지 않거나 "none"으로 고정 */
                      strokeDasharray="none" 
                      /* 애니메이션 없이 상태에 따라 투명도만 즉시 변경 */
                      style={{
                        opacity: isEditing ? 0.8 : 0.4,
                        transition: 'opacity 0.2s ease', // 선택할 때 부드러운 느낌만 살짝 추가
                        cursor: 'pointer'
                      }}
                    />
                  </g>
                );
              })}
            </svg>
            {/* Dots */}
            {dots.map((dot) => (
              <motion.div 
                key={dot.id} 
                onPanStart={handleDragStart}
                onPanEnd={handleDragEnd}
                onPan={(_, info) => handleDrag(dot.id, info)}
                initial={{ scale: 0, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                style={{ top: dot.top, left: dot.left, x: "-50%", y: "-50%" }} 
                className="absolute z-10 group" 
                onClick={(e) => { e.stopPropagation(); handleDotClick(dot.id); }}
              >
                <div style={{ backgroundColor: dot.color || (dot.group === 'tech' ? 'var(--color-dots-accent)' : dot.group === 'art' ? '#D97706' : dot.group === 'social' ? '#2563EB' : '#059669') }} className={`w-5 h-5 rounded-full cursor-grab active:cursor-grabbing relative border-2 border-[var(--color-dots-bg)] shadow-lg hover:scale-125 transition-all touch-none ${selectedDots.includes(dot.id) || editingDotId === dot.id ? 'ring-4 ring-purple-600 scale-110' : ''}`}>
                  <div className="absolute top-6 -left-10 w-24 text-center text-[10px] uppercase tracking-wider opacity-60 font-bold group-hover:opacity-100 transition-opacity">{dot.label}</div>
                </div>
              </motion.div>
            ))}

            {/* Hero Text Overlay */}
            <div className="absolute top-10 right-10 text-right pointer-events-none">
              <h1 className="text-5xl font-extralight tracking-tight leading-none opacity-80" dangerouslySetInnerHTML={{ __html: t.hero }} />
              <p className="text-[10px] opacity-40 mt-3 tracking-widest uppercase font-bold">{t.since}</p>
            </div>

            {/* Final Overlay UI */}
            <AnimatePresence>
              {showBridgePrompt && !isAnalyzing && (
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-10 right-10 w-80 glass-box p-6 rounded-3xl z-40 border-2 border-purple-500 shadow-2xl">
                  <h3 className="text-purple-600 dark:text-purple-400 text-sm font-bold mb-4">{t.bridgeAsk}</h3>
                  <div className="flex gap-3">
                    <button onClick={handleApproveBridge} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-full transition-colors cursor-pointer">
                      {t.approve}
                    </button>
                    <button onClick={handleRejectBridge} className="flex-1 border border-purple-600 text-purple-600 hover:bg-purple-50 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-full transition-colors cursor-pointer">
                      {t.reject}
                    </button>
                  </div>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute bottom-10 right-10 w-80 glass-box p-6 rounded-3xl z-40">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-purple-600" />
                    <span className="text-xs font-medium">{t.saving}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-10 left-10 w-60 bg-white/30 dark:bg-black/30 border border-[var(--color-dots-border)] p-4 rounded-xl text-[9px] leading-tight space-y-2 pointer-events-none">
              <div className="opacity-40 font-bold uppercase tracking-widest mb-1">{t.uncertainty}</div>
              <div className="opacity-60">• {t.moveHint}</div>
              <div className="opacity-60">• {dots.length < 5 ? t.dataThinness : t.variance}</div>
              <div className="opacity-60">• {t.warning}</div>
              <div className="text-amber-600 dark:text-amber-400 font-bold mt-2">{t.missing}</div>
            </div>
          </div>
        ) : activeMenu === 'report' ? (
          <div className="flex-1 p-20 overflow-y-auto bg-[var(--color-dots-bg)]">
            <h2 className="text-4xl font-light mb-12 opacity-80">{t.future}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {bridgeReports.map((report, i) => (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={report.id} className="glass-box p-8 rounded-[32px] flex flex-col h-full group/report relative">
                  <button 
                    onClick={() => deleteReport(report.id)}
                    className="absolute top-6 right-6 p-2 opacity-0 group-hover/report:opacity-40 hover:!opacity-100 transition-all text-red-500 cursor-pointer"
                  >
                    <X size={16} />
                  </button>

                  <div className="text-[10px] uppercase opacity-40 font-bold mb-2 tracking-widest">{new Date(report.date).toLocaleDateString()}</div>
                  <h3 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-400">{report.title}</h3>
                  
                  <div className="flex flex-wrap gap-2 mb-6 flex-1 items-start content-start">
                    {report.keywords.map((kw, idx) => (
                      <div key={idx} className="group/kw relative flex items-center bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 transition-all hover:pr-8">
                        <input 
                          type="text"
                          value={kw}
                          onChange={(e) => updateKeyword(report.id, idx, e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-xs font-medium w-auto min-w-[40px] appearance-none outline-none"
                          style={{ width: `${Math.max(4, kw.length)}ch` }}
                        />
                        <button 
                          onClick={() => deleteKeyword(report.id, idx)}
                          className="absolute right-2 opacity-0 group-hover/kw:opacity-100 text-purple-400 hover:text-purple-600 cursor-pointer p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => suggestCurationWithKeywords(report.keywords)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg"
                  >
                    {t.curateBtn}
                  </button>
                </motion.div>
              ))}
              {bridgeReports.length === 0 && (
                <div className="col-span-full py-20 text-center opacity-30 italic">{t.dataThinness}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-20 overflow-y-auto bg-[var(--color-dots-bg)]">
            <h2 className="text-4xl font-light mb-12 opacity-80">{t.growth}</h2>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-box p-12 rounded-[48px] max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-purple-600" />
                <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-100">{t.curationTitle}</h3>
              </div>
              <div className="text-lg leading-relaxed opacity-80 space-y-6">
                {curationResult ? curationResult.split('\n').map((p, i) => <p key={i}>{p}</p>) : <p className="animate-pulse">{t.predictionDesc}</p>}
              </div>
            </motion.div>
          </div>
        )}

        {/* Edit Panel for Dot */}
        <AnimatePresence>
          {editingDotId && (
            <motion.div 
              initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
              className="absolute top-1/2 right-4 -translate-y-1/2 w-48 glass-box p-4 rounded-2xl z-30"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.edit}</span>
                <button onClick={() => deleteDot(editingDotId)} className="text-red-500 hover:text-red-600">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase opacity-40 mb-1 block">{t.color}</label>
                  <div className="flex gap-2">
                    {['#A855F7', '#D97706', '#2563EB', '#059669', '#EF4444'].map(c => (
                      <button 
                        key={c} onClick={() => updateDotColor(editingDotId, c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 ${dots.find(d => d.id === editingDotId)?.color === c ? 'border-white' : 'border-transparent'}`}
                      />
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => deleteDot(editingDotId)}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase rounded-lg transition-colors"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          )}

          {editingConnIdx !== null && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="absolute top-1/2 right-4 -translate-y-1/2 w-64 glass-box p-6 rounded-3xl z-50 border border-white/20 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.edit} {t.constellation}</span>
                </div>
                <button onClick={() => setEditingConnIdx(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
                  <X size={16} className="opacity-40" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-40">{t.width}</label>
                    <span className="text-[10px] font-mono opacity-60">{connections[editingConnIdx].width}px</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="10" step="0.5" 
                    value={connections[editingConnIdx].width}
                    onChange={(e) => setConnections(connections.map((c, i) => i === editingConnIdx ? { ...c, width: parseFloat(e.target.value) } : c))}
                    className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider opacity-40">{t.curvature}</label>
                    <span className="text-[10px] font-mono opacity-60">{connections[editingConnIdx].curvature}</span>
                  </div>
                  <input 
                    type="range" min="-30" max="30" step="1" 
                    value={connections[editingConnIdx].curvature}
                    onChange={(e) => setConnections(connections.map((c, i) => i === editingConnIdx ? { ...c, curvature: parseInt(e.target.value) } : c))}
                    className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-40 mb-3 block">{t.style || 'Line Style'}</label>
                  <div className="flex gap-2 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConnections(connections.map((c, i) => i === editingConnIdx ? { ...c, dashed: false } : c)); }}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${!connections[editingConnIdx].dashed ? 'bg-purple-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                      {t.solid}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConnections(connections.map((c, i) => i === editingConnIdx ? { ...c, dashed: true } : c)); }}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${connections[editingConnIdx].dashed ? 'bg-purple-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                    >
                      {t.dashed}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button 
                    onClick={() => deleteConnection(editingConnIdx)}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={12} />
                    {t.delete}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Input Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg glass-box p-8 rounded-[40px] relative"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
              >
                <X size={20} className="opacity-40" />
              </button>

              <h2 className="text-2xl font-bold mb-6 text-purple-900 dark:text-purple-100">{t.addTitle}</h2>
              
              <textarea 
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-40 bg-transparent border-none focus:ring-0 text-lg resize-none placeholder:opacity-30 p-0 outline-none"
                disabled={isAnalyzing}
              />

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-[var(--color-dots-border)]">
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                    <Loader2 size={16} className="animate-spin" />
                    {t.saving}
                  </div>
                ) : <div />}

                <button 
                  onClick={handleAddDot}
                  disabled={isAnalyzing || !newEntry.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-30 text-white px-8 py-3 rounded-full font-bold transition-all shadow-xl shadow-purple-500/20 flex items-center gap-2"
                >
                  <Send size={16} />
                  {t.save}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 text-sm uppercase tracking-widest cursor-pointer transition-all ${active ? 'opacity-100 font-bold' : 'opacity-40 hover:opacity-70'}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Stat({ label, value, color = "var(--color-dots-text)" }: { label: string, value: string, color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase opacity-40 font-medium mb-1 tracking-wider">{label}</div>
      <div className="text-xl font-light" style={{ color }}>{value}</div>
    </div>
  );
}

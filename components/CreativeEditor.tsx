
import React, { useRef, useState, useEffect } from 'react';
import { GeneratedImage, EditorElement, HistoryState, Mockup } from '../types';
import { generateStamp } from '../services/geminiService';
import { saveToLibrary } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { STICKER_CATEGORIES, MOCKUPS, TEMPLATES } from '../constants';

interface CreativeEditorProps {
  initialImage: GeneratedImage | null;
  onBack: () => void;
}

export const CreativeEditor: React.FC<CreativeEditorProps> = ({ initialImage, onBack }) => {
  const { decrementCredit, user } = useAuth();
  
  // State Principal
  const [currentBg, setCurrentBg] = useState<string | null>(initialImage?.data || null);
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [filter, setFilter] = useState('none');

  // Histórico (Undo/Redo)
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI State
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<'stickers' | 'text' | 'magic' | 'mockups' | 'templates' | null>(null);
  const [stickerCategory, setStickerCategory] = useState<string>('Básicos');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMockupModal, setShowMockupModal] = useState(false);
  const [selectedMockup, setSelectedMockup] = useState<Mockup>(MOCKUPS[0]);
  
  // Magic Tool & Mockup AI
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isProcessingMagic, setIsProcessingMagic] = useState(false);
  const [generatedMockupUrl, setGeneratedMockupUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Inicialização e Histórico ---
  useEffect(() => {
    saveHistory(); // Salva estado inicial
  }, []);

  const saveHistory = () => {
      const newState: HistoryState = {
          bg: currentBg,
          elements: JSON.parse(JSON.stringify(elements)), // Deep copy
          filter
      };
      
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      
      // Limita histórico a 20 passos
      if (newHistory.length > 20) newHistory.shift();
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
      if (historyIndex > 0) {
          const prevState = history[historyIndex - 1];
          setCurrentBg(prevState.bg);
          setElements(prevState.elements);
          setFilter(prevState.filter);
          setHistoryIndex(historyIndex - 1);
          setSelectedElementId(null);
      }
  };

  const redo = () => {
      if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1];
          setCurrentBg(nextState.bg);
          setElements(nextState.elements);
          setFilter(nextState.filter);
          setHistoryIndex(historyIndex + 1);
          setSelectedElementId(null);
      }
  };

  // --- Manipulação de Elementos ---

  const addElement = (type: 'sticker' | 'text', content: string) => {
    const newEl: EditorElement = {
      id: Date.now().toString(),
      type,
      content,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      color: '#FFFFFF',
      font: 'hand',
      isLocked: false,
      zIndex: elements.length + 1
    };
    setElements([...elements, newEl]);
    setSelectedElementId(newEl.id);
    setSelectedTool(null);
    saveHistory();
  };

  const updateElement = (id: string, updates: Partial<EditorElement>) => {
      setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const handleLayer = (direction: 'up' | 'down' | 'front' | 'back') => {
      if (!selectedElementId) return;
      
      setElements(prev => {
          const index = prev.findIndex(e => e.id === selectedElementId);
          if (index === -1) return prev;
          
          const newArr = [...prev];
          const item = newArr.splice(index, 1)[0];
          
          if (direction === 'front') newArr.push(item);
          else if (direction === 'back') newArr.unshift(item);
          else if (direction === 'up' && index < prev.length - 1) newArr.splice(index + 1, 0, item);
          else if (direction === 'down' && index > 0) newArr.splice(index - 1, 0, item);
          else newArr.splice(index, 0, item);
          
          return newArr;
      });
      saveHistory();
  };

  // --- Drag & Drop ROBUSTO ---
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const el = elements.find(el => el.id === id);
      if (!el || el.isLocked) return;

      setSelectedElementId(id);
      
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startElX = el.x;
      const startElY = el.y;
      
      const containerRect = canvasRef.current?.getBoundingClientRect();
      if(!containerRect) return;

      const handleMove = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;
          
          const percentX = (deltaX / containerRect.width) * 100;
          const percentY = (deltaY / containerRect.height) * 100;

          updateElement(id, {
              x: startElX + percentX,
              y: startElY + percentY
          });
      };

      const handleUp = () => {
          target.removeEventListener('pointermove', handleMove as any);
          target.removeEventListener('pointerup', handleUp as any);
          saveHistory();
      };

      target.addEventListener('pointermove', handleMove as any);
      target.addEventListener('pointerup', handleUp as any);
  };


  // --- Ferramentas Avançadas ---

  const handleMagicEdit = async () => {
    if (!magicPrompt.trim() || !currentBg) return;
    setIsProcessingMagic(true);
    try {
        // Modo Edição Mágica (muda a arte em si)
        const newImageBase64 = await generateStamp(magicPrompt, null, currentBg, false);
        setCurrentBg(newImageBase64);
        setMagicPrompt('');
        setSelectedTool(null);
        decrementCredit();
        saveHistory();
    } catch (e: any) {
        alert("Erro: " + e.message);
    } finally {
        setIsProcessingMagic(false);
    }
  };
  
  const handleGenerateMockup = async () => {
      if (!canvasRef.current) return;
      setIsProcessingMagic(true);
      
      try {
          // 1. Capturar a arte atual do canvas
          const canvasData = await captureCanvas();
          if(!canvasData) throw new Error("Erro ao capturar arte.");
          
          // 2. Chamar IA para gerar Mockup
          const mockupBase64 = await generateStamp(selectedMockup.prompt!, null, canvasData, true);
          setGeneratedMockupUrl(mockupBase64);
          decrementCredit();

      } catch (e: any) {
          alert("Erro ao gerar mockup: " + e.message);
      } finally {
          setIsProcessingMagic(false);
      }
  };

  const applyTemplate = (tpl: any) => {
      if(confirm("Substituir arte atual pelo template?")) {
          const tplElements = tpl.elements.map((el: any) => ({...el, id: Date.now() + Math.random().toString()}));
          setElements(tplElements);
          if(tpl.bgUrl) setCurrentBg(tpl.bgUrl);
          else setCurrentBg(null);
          saveHistory();
          setSelectedTool(null);
      }
  };
  
  const captureCanvas = async (): Promise<string | null> => {
      if (!canvasRef.current) return null;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const width = 1024;
      const height = 1024;
      canvas.width = width;
      canvas.height = height;

      // Desenha fundo
      if (currentBg) {
          const img = new Image();
          img.src = currentBg;
          await new Promise(r => img.onload = r);
          
          ctx.filter = filter;
          ctx.drawImage(img, 0, 0, width, height);
          ctx.filter = 'none';
      } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0,0,width,height);
      }

      // Desenha Elementos
      for (const el of elements) {
          ctx.save();
          const x = (el.x / 100) * width;
          const y = (el.y / 100) * height;
          
          ctx.translate(x, y);
          ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.scale(el.scale, el.scale);

          if (el.type === 'text') {
              ctx.font = 'bold 80px "Comic Sans MS", cursive';
              ctx.fillStyle = el.color || '#FFFFFF';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.lineWidth = 4;
              ctx.strokeStyle = 'black';
              ctx.strokeText(el.content, 0, 0);
              ctx.fillText(el.content, 0, 0);
          } else {
              ctx.font = '100px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(el.content, 0, 0);
          }
          ctx.restore();
      }

      return canvas.toDataURL('image/png');
  };

  const handleSaveReal = async () => {
      const finalData = await captureCanvas();
      if(!finalData) return;
      
      // Use await to handle quota errors gracefully
      await saveToLibrary({
          id: Date.now().toString(),
          data: finalData,
          prompt: "Arte Criativo",
          presetName: `Criativo - ${new Date().toLocaleDateString()}`,
          createdAt: Date.now(),
          tags: ['criativo']
      });

      alert("Arte salva com sucesso!");
  };

  const handleSaveMockup = async () => {
      if(!generatedMockupUrl) return;
      await saveToLibrary({
          id: Date.now().toString(),
          data: generatedMockupUrl,
          prompt: `Mockup ${selectedMockup.name}`,
          presetName: "Mockup",
          createdAt: Date.now(),
          tags: ['mockup']
      });
      alert("Mockup salvo na biblioteca!");
      setShowMockupModal(false);
      setGeneratedMockupUrl(null);
  };

  const selectedEl = elements.find(e => e.id === selectedElementId);

  // --- RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 shadow-md flex justify-between items-center z-30 shrink-0">
        <button onClick={onBack} className="text-gray-600 font-bold px-3 py-2 bg-gray-100 rounded-xl hover:bg-gray-200">
            <i className="fa-solid fa-arrow-left"></i> Voltar
        </button>
        
        <div className="flex gap-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"><i className="fa-solid fa-rotate-left"></i></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg bg-gray-100 disabled:opacity-30"><i className="fa-solid fa-rotate-right"></i></button>
        </div>

        <button onClick={handleSaveReal} className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-green-600 flex items-center gap-2 animate-pulse-slow">
          <i className="fa-solid fa-floppy-disk"></i> Salvar
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 relative bg-gray-200 overflow-hidden flex items-center justify-center p-4">
        
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 3))} className="w-12 h-12 bg-white rounded-full shadow text-xl font-bold text-gray-700">+</button>
            <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.5))} className="w-12 h-12 bg-white rounded-full shadow text-xl font-bold text-gray-700">-</button>
        </div>

        {/* Canvas Area */}
        <div 
            ref={canvasRef}
            className="relative bg-white shadow-2xl transition-transform duration-100 ease-linear"
            style={{ 
                width: '100%', 
                maxWidth: '500px', 
                aspectRatio: '1/1',
                transform: `scale(${zoomLevel})`,
                filter: filter
            }}
            onClick={() => setSelectedElementId(null)}
        >
            {/* Background Image */}
            {currentBg ? (
                <img src={currentBg} className="w-full h-full object-contain pointer-events-none" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    Sem Imagem de Fundo
                </div>
            )}

            {/* Elements */}
            {elements.map(el => (
                <div
                    key={el.id}
                    onPointerDown={(e) => handlePointerDown(e, el.id)}
                    className={`absolute select-none flex items-center justify-center cursor-move touch-none ${selectedElementId === el.id ? 'z-50' : ''}`}
                    style={{
                        left: `${el.x}%`,
                        top: `${el.y}%`,
                        transform: `translate(-50%, -50%) scale(${el.scale}) rotate(${el.rotation}deg)`,
                        zIndex: el.zIndex,
                        opacity: el.isLocked ? 0.7 : 1
                    }}
                >
                    <div className={`relative p-1 ${selectedElementId === el.id ? 'border-2 border-dashed border-blue-500' : ''}`}>
                        {el.type === 'text' ? (
                            <span style={{ 
                                color: el.color, 
                                fontSize: '40px', 
                                fontFamily: 'Comic Sans MS', 
                                textShadow: '2px 2px 0 #000',
                                whiteSpace: 'nowrap'
                            }}>
                                {el.content}
                            </span>
                        ) : (
                            <span style={{ fontSize: '50px' }}>{el.content}</span>
                        )}
                        {el.isLocked && <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 text-[10px]"><i className="fa-solid fa-lock"></i></div>}
                    </div>
                </div>
            ))}
            
            {/* Loading Overlay */}
            {isProcessingMagic && (
                <div className="absolute inset-0 bg-white/80 z-[100] flex items-center justify-center flex-col backdrop-blur-sm">
                    <i className="fa-solid fa-wand-magic-sparkles fa-spin text-5xl text-brand-purple mb-4"></i>
                    <p className="font-bold text-xl text-brand-purple">
                        {showMockupModal ? "Criando Mockup..." : "A IA está criando..."}
                    </p>
                </div>
            )}
        </div>
      </div>

      {/* Mockup Modal Overlay */}
      {showMockupModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
                  <button onClick={() => { setShowMockupModal(false); setGeneratedMockupUrl(null); }} className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow"><i className="fa-solid fa-xmark"></i></button>
                  
                  <div className="bg-gray-50 p-4 border-b">
                      <h3 className="text-lg font-bold text-gray-800 text-center">Gerar Mockup Realista</h3>
                      <p className="text-xs text-gray-500 text-center">A IA aplicará sua arte no produto escolhido</p>
                  </div>

                  <div className="flex-1 bg-gray-100 relative flex items-center justify-center min-h-[300px]">
                      {generatedMockupUrl ? (
                          <img src={generatedMockupUrl} className="max-h-full max-w-full object-contain shadow-lg" />
                      ) : (
                          <div className="text-center p-8 text-gray-400">
                             <i className="fa-solid fa-image text-4xl mb-2"></i>
                             <p>Selecione um produto abaixo e clique em Gerar</p>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-white border-t">
                      <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
                          {MOCKUPS.map(m => (
                              <button key={m.id} onClick={() => { setSelectedMockup(m); setGeneratedMockupUrl(null); }} className={`p-2 border rounded-lg flex flex-col items-center min-w-[80px] ${selectedMockup.id === m.id ? 'border-brand-purple bg-purple-50' : ''}`}>
                                  <i className="fa-solid fa-box-open text-xl mb-1 text-gray-600"></i>
                                  <span className="text-xs font-bold">{m.name}</span>
                              </button>
                          ))}
                      </div>

                      {generatedMockupUrl ? (
                          <button onClick={handleSaveMockup} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg animate-pulse-slow">
                              <i className="fa-solid fa-check mr-2"></i> Salvar Mockup na Biblioteca
                          </button>
                      ) : (
                          <button onClick={handleGenerateMockup} disabled={isProcessingMagic} className="w-full bg-brand-purple text-white py-3 rounded-xl font-bold shadow-lg">
                              {isProcessingMagic ? <i className="fa-solid fa-spinner fa-spin"></i> : <span><i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Gerar Mockup ({user.credits})</span>}
                          </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Controls */}
      <div className="bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] rounded-t-3xl z-40 shrink-0 flex flex-col">
        {selectedEl && (
            <div className="p-3 border-b border-gray-100 flex gap-4 overflow-x-auto no-scrollbar items-center justify-center bg-gray-50">
                 <div className="flex flex-col items-center min-w-[70px]">
                     <span className="text-[10px] uppercase font-bold text-gray-400">Tamanho</span>
                     <input type="range" min="0.5" max="3" step="0.1" value={selectedEl.scale} onChange={e => { updateElement(selectedEl.id, {scale: parseFloat(e.target.value)}); saveHistory(); }} className="w-20 accent-brand-purple" />
                 </div>
                 <div className="flex flex-col items-center min-w-[70px]">
                     <span className="text-[10px] uppercase font-bold text-gray-400">Girar</span>
                     <input type="range" min="0" max="360" value={selectedEl.rotation} onChange={e => { updateElement(selectedEl.id, {rotation: parseInt(e.target.value)}); saveHistory(); }} className="w-20 accent-brand-purple" />
                 </div>
                 {selectedEl.type === 'text' && (
                     <div className="flex flex-col items-center">
                         <span className="text-[10px] uppercase font-bold text-gray-400">Cor</span>
                         <input type="color" value={selectedEl.color} onChange={e => { updateElement(selectedEl.id, {color: e.target.value}); saveHistory(); }} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm" />
                     </div>
                 )}
                 <div className="h-8 w-px bg-gray-300 mx-2"></div>
                 <button onClick={() => handleLayer('front')} className="p-2 bg-white rounded shadow text-gray-600"><i className="fa-solid fa-angles-up"></i></button>
                 <button onClick={() => handleLayer('back')} className="p-2 bg-white rounded shadow text-gray-600"><i className="fa-solid fa-angles-down"></i></button>
                 <button onClick={() => { updateElement(selectedEl.id, {isLocked: !selectedEl.isLocked}); setSelectedElementId(null); }} className={`p-2 rounded shadow ${selectedEl.isLocked ? 'bg-red-500 text-white' : 'bg-white text-gray-600'}`}><i className="fa-solid fa-lock"></i></button>
                 <button onClick={() => { setElements(elements.filter(e => e.id !== selectedEl.id)); setSelectedElementId(null); saveHistory(); }} className="p-2 bg-red-100 text-red-500 rounded shadow"><i className="fa-solid fa-trash"></i></button>
            </div>
        )}

        {/* Drawers */}
        {selectedTool === 'stickers' && (
            <div className="p-4 bg-gray-50 border-b animate-slide-up">
                 <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                     {Object.keys(STICKER_CATEGORIES).map(cat => (
                         <button key={cat} onClick={() => setStickerCategory(cat)} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${stickerCategory === cat ? 'bg-brand-purple text-white' : 'bg-white border text-gray-600'}`}>{cat}</button>
                     ))}
                 </div>
                 <div className="flex gap-4 overflow-x-auto text-4xl p-2">
                     {(STICKER_CATEGORIES as any)[stickerCategory].map((s:string, i:number) => (
                         <button key={i} onClick={() => addElement('sticker', s)} className="hover:scale-125 transition-transform">{s}</button>
                     ))}
                 </div>
            </div>
        )}

        {selectedTool === 'magic' && (
             <div className="p-4 bg-purple-50 border-b animate-slide-up">
                 <label className="text-xs font-bold text-brand-purple uppercase mb-1 block">O que você quer mudar?</label>
                 <div className="flex gap-2">
                     <input type="text" value={magicPrompt} onChange={e => setMagicPrompt(e.target.value)} placeholder="Ex: Adicionar borda dourada..." className="flex-1 rounded-xl border-none px-3 py-2 text-white placeholder-purple-200 bg-[#8b34ff] outline-none" />
                     <button onClick={handleMagicEdit} className="bg-brand-purple text-white px-4 rounded-xl font-bold"><i className="fa-solid fa-wand-magic-sparkles"></i></button>
                 </div>
             </div>
        )}

        {selectedTool === 'templates' && (
            <div className="p-4 bg-gray-50 border-b flex gap-4 overflow-x-auto animate-slide-up">
                {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)} className="bg-white p-2 rounded-xl border shadow-sm min-w-[100px] flex flex-col items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full mb-1 flex items-center justify-center">📄</div>
                        <span className="text-xs font-bold">{t.name}</span>
                    </button>
                ))}
            </div>
        )}

        {/* Main Toolbar */}
        <div className="p-4 grid grid-cols-5 gap-2 text-center">
            <button onClick={() => setSelectedTool(selectedTool === 'templates' ? null : 'templates')} className="flex flex-col items-center text-gray-600 hover:text-brand-purple">
                <i className="fa-solid fa-shapes text-2xl mb-1"></i>
                <span className="text-[10px] font-bold">Templates</span>
            </button>
            <button onClick={() => setSelectedTool(selectedTool === 'magic' ? null : 'magic')} className="flex flex-col items-center text-brand-purple">
                <div className="bg-brand-light p-2 rounded-xl mb-1"><i className="fa-solid fa-wand-magic-sparkles text-xl"></i></div>
                <span className="text-[10px] font-bold">IA Mágica</span>
            </button>
            <button onClick={() => setSelectedTool(selectedTool === 'stickers' ? null : 'stickers')} className="flex flex-col items-center text-gray-600 hover:text-brand-purple">
                <i className="fa-solid fa-face-smile text-2xl mb-1"></i>
                <span className="text-[10px] font-bold">Stickers</span>
            </button>
             <button onClick={() => { const t = prompt("Texto:"); if(t) addElement('text', t); }} className="flex flex-col items-center text-gray-600 hover:text-brand-purple">
                <i className="fa-solid fa-font text-2xl mb-1"></i>
                <span className="text-[10px] font-bold">Texto</span>
            </button>
             <button onClick={() => setShowMockupModal(true)} className="flex flex-col items-center text-gray-600 hover:text-brand-purple">
                <i className="fa-solid fa-shirt text-2xl mb-1"></i>
                <span className="text-[10px] font-bold">Mockup</span>
            </button>
        </div>
      </div>
    </div>
  );
};

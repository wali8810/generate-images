import React, { useState, useRef } from 'react';
import { PRESETS, WARNING_MSG_PAYMENT } from '../constants';
import { Preset, UserState } from '../types';
import { generateStamp } from '../services/geminiService';
import { saveToLibrary } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';

interface GeneratorProps {
  user: UserState;
  setView: (v: any) => void;
  isBlocked?: boolean;
}

const CUTE_LOADING_MSGS = [
  "Criando magia... ✨",
  "Misturando as cores... 🎨",
  "Espere um pouquinho... 🌸",
  "Quase pronto... 🐇",
  "Ajustando os detalhes... 🎀"
];

export const Generator: React.FC<GeneratorProps> = ({ user, setView, isBlocked = false }) => {
  const { decrementCredit, isAdmin, dbUser } = useAuth();
  const [inputText, setInputText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(CUTE_LOADING_MSGS[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Image Upload State
  const [referenceImg, setReferenceImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation for mobile memory
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Imagem muito grande. Escolha uma menor.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImg(reader.result as string);
        setSelectedPreset(null); // Limpa estilo ao carregar imagem
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    // Prevent double tap
    if (isLoading) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!inputText.trim()) {
      setErrorMsg("Por favor, digite o que você quer criar ou mudar.");
      return;
    }

    if (!referenceImg && !selectedPreset) {
      setErrorMsg("Por favor, escolha um estilo abaixo.");
      return;
    }

    if (user.credits <= 0) {
      setErrorMsg("Seus créditos acabaram. Volte amanhã!");
      return;
    }

    setIsLoading(true);

    const msgInterval = setInterval(() => {
      setLoadingMsg(CUTE_LOADING_MSGS[Math.floor(Math.random() * CUTE_LOADING_MSGS.length)]);
    }, 2000);

    try {
      // 1. Generate Image
      const base64Image = await generateStamp(inputText, selectedPreset, referenceImg || undefined);

      if (!base64Image) {
        throw new Error("A IA não retornou uma imagem válida.");
      }

      // 2. Save to Library (Async with Compression)
      await saveToLibrary({
        id: Date.now().toString(),
        data: base64Image,
        prompt: inputText,
        presetName: referenceImg ? "Edição Personalizada" : (selectedPreset?.label || "Personalizado"),
        createdAt: Date.now(),
        tags: selectedPreset ? [selectedPreset.id] : ['upload']
      });

      // 3. Update Credits
      decrementCredit();

      setSuccessMsg("Arte gerada com sucesso! Veja na sua Biblioteca.");
      setInputText('');
      setReferenceImg(null);

      // Delay transition to ensure state updates
      setTimeout(() => setView('library'), 1000);

    } catch (e: any) {
      console.error("Generator Error:", e);
      setErrorMsg(e.message || "Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      clearInterval(msgInterval);
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-24 p-4 max-w-lg mx-auto">

      {/* Upload Section */}
      <div className={`rounded-2xl shadow-sm p-4 mb-4 border relative group transition-all ${referenceImg ? 'bg-purple-50 border-brand-purple' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-center mb-2">
          <label className="font-bold text-gray-700 flex items-center gap-2">
            <i className="fa-solid fa-image text-brand-purple"></i>
            {referenceImg ? "Imagem Base Carregada" : "Envie sua Imagem (Opcional)"}
            <i className="fa-solid fa-circle-question text-gray-300 ml-1" data-tooltip="Use uma foto para a IA modificar ou transformar"></i>
          </label>
          {referenceImg && (
            <button onClick={() => setReferenceImg(null)} className="text-red-500 text-xs font-bold hover:underline">Remover</button>
          )}
        </div>

        {!referenceImg ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-brand-purple transition-colors"
          >
            <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 mb-2"></i>
            <p className="text-sm text-gray-500">Toque para enviar uma foto do celular ou computador</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex gap-4 items-center">
            <div className="relative rounded-xl overflow-hidden border-2 border-brand-purple h-24 w-24 bg-gray-100 flex-shrink-0">
              <img src={referenceImg} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm text-gray-600 flex-1">
              <p className="font-bold text-brand-purple mb-1"><i className="fa-solid fa-wand-magic"></i> Modo de Edição Ativo</p>
              <p>Você está editando a imagem enviada. Os estilos foram desativados.</p>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-2 border-brand-light">
        <label className="block text-xl font-bold text-gray-700 mb-3">
          {referenceImg ? "O que vamos mudar na imagem?" : "O que vamos criar hoje?"}
        </label>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={referenceImg ? "Ex: Adicionar um laço rosa, remover o fundo, transformar em desenho..." : "Ex: Coelhinha fofa com laço rosa, Flores de hibisco..."}
          className="w-full p-4 text-lg border-2 border-brand-purple bg-brand-light text-brand-dark rounded-xl focus:ring-2 focus:ring-brand-purple outline-none h-32 resize-none placeholder-brand-dark/50 font-medium"
        />
      </div>

      {/* Presets Grid */}
      {!referenceImg && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-600 mb-3 px-2">Escolha o estilo (Toque para selecionar):</h3>
          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all transform active:scale-95 ${selectedPreset?.id === preset.id
                  ? 'border-brand-purple bg-brand-light scale-105 shadow-md'
                  : 'border-gray-200 bg-white hover:border-brand-purple/50'
                  }`}
                title={preset.promptSuffix}
              >
                <i className={`fa-solid ${preset.icon} text-2xl mb-2 ${selectedPreset?.id === preset.id ? 'text-brand-purple' : 'text-gray-400'}`}></i>
                <span className={`text-xs font-bold text-center leading-tight ${selectedPreset?.id === preset.id ? 'text-brand-purple' : 'text-gray-500'}`}>
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="sticky bottom-4 bg-gray-50/95 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-2xl z-20">

        {errorMsg && (
          <div className="mb-3 bg-red-100 text-red-700 p-3 rounded-lg text-center font-bold animate-pulse">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 bg-green-100 text-green-700 p-3 rounded-lg text-center font-bold">
            {successMsg}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || user.credits <= 0 || isBlocked}
          className={`w-full py-5 rounded-2xl text-2xl font-extrabold text-white shadow-lg transition-all ${isLoading || user.credits <= 0 || isBlocked
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-brand-purple hover:bg-brand-dark active:scale-95 animate-pulse-slow'
            }`}
          data-tooltip={isBlocked ? "Conta bloqueada. Contate o administrador." : "Clique para criar sua arte mágica"}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <i className="fa-solid fa-spinner fa-spin text-3xl"></i>
              <span className="text-xl">{loadingMsg}</span>
            </span>
          ) : isBlocked ? (
            <span>🔒 CONTA BLOQUEADA</span>
          ) : (
            <span>{referenceImg ? "TRANSFORMAR IMAGEM" : "GERAR ARTE"} ({user.credits})</span>
          )}
        </button>
      </div>
    </div>
  );
};
import React, { useState } from 'react';

interface OnboardingProps {
  onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: "Bem-vinda ao Estampa Mágica! ✨",
      text: "Aqui você cria artes lindas para seus artesanatos em segundos, mesmo sem saber desenhar.",
      icon: "fa-wand-magic-sparkles"
    },
    {
      title: "Como funciona? 🎨",
      text: "1. Escreva o que você quer (ex: 'Gatinho fofo').\n2. Escolha um estilo.\n3. Clique em Gerar!",
      icon: "fa-pencil"
    },
    {
      title: "Novo Modo Criativo! ✂️",
      text: "Agora você pode adicionar laços, textos e molduras nas suas artes depois de criar. Divirta-se!",
      icon: "fa-shapes"
    }
  ];

  const currentStep = steps[step - 1];

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-4 border-brand-light relative overflow-hidden">
        
        {/* Decorative Circle */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-light rounded-full opacity-50"></div>
        
        <div className="w-20 h-20 bg-brand-purple text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg animate-bounce-slow">
          <i className={`fa-solid ${currentStep.icon}`}></i>
        </div>

        <h2 className="text-2xl font-black text-gray-800 mb-4">{currentStep.title}</h2>
        <p className="text-gray-600 text-lg mb-8 whitespace-pre-line leading-relaxed">{currentStep.text}</p>

        <div className="flex gap-2 justify-center mb-6">
            {steps.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all ${i + 1 === step ? 'w-8 bg-brand-purple' : 'w-2 bg-gray-300'}`}></div>
            ))}
        </div>

        <button
          onClick={() => {
            if (step < steps.length) setStep(step + 1);
            else onClose();
          }}
          className="w-full bg-brand-purple text-white font-bold py-4 rounded-xl text-xl hover:bg-brand-dark transition-transform active:scale-95 shadow-lg"
        >
          {step < steps.length ? 'Próximo' : 'Começar a Criar!'}
        </button>
      </div>
    </div>
  );
};

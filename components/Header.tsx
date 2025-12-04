
import React from 'react';
import { ICON_URL, APP_NAME } from '../constants';

interface HeaderProps {
  currentView: string;
  setView: (view: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  const getTabClass = (view: string) => {
    const base = "flex-1 py-4 text-center text-xs md:text-sm font-bold transition-colors cursor-pointer border-b-4 flex flex-col items-center justify-center gap-1 ";
    if (currentView === view) {
      return base + "border-white bg-white/10 text-white";
    }
    return base + "border-transparent text-white/70 hover:text-white hover:bg-white/5";
  };

  return (
    <div className="bg-brand-purple shadow-lg sticky top-0 z-50">
      <div className="flex items-center justify-center p-3">
        <img src={ICON_URL} alt="Ícone" className="w-10 h-10 mr-2 rounded-full shadow-md bg-white p-1" />
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-wide uppercase">{APP_NAME}</h1>
      </div>
      
      <div className="flex justify-between items-center max-w-md mx-auto overflow-x-auto">
        <div onClick={() => setView('generator')} className={getTabClass('generator')}>
          <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
          Criar
        </div>
        <div onClick={() => setView('library')} className={getTabClass('library')}>
          <i className="fa-solid fa-images text-xl"></i>
          Biblio
        </div>
        <div onClick={() => setView('creative')} className={getTabClass('creative')}>
          <i className="fa-solid fa-palette text-xl"></i>
          Criativo
        </div>
         <div onClick={() => setView('profile')} className={getTabClass('profile')}>
          <i className="fa-solid fa-user text-xl"></i>
          Perfil
        </div>
      </div>
    </div>
  );
};

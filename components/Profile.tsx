
import React from 'react';
import { UserState } from '../types';
import { PREMIUM_PRICE } from '../constants';

interface ProfileProps {
  user: UserState;
  onChangeKey: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
  
  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center border-t-8 border-brand-purple flex flex-col items-center">
        <div className="w-20 h-20 rounded-full mb-3 border-4 border-gray-100 shadow-sm bg-brand-light flex items-center justify-center overflow-hidden">
             <i className="fa-solid fa-user text-3xl text-brand-purple"></i>
        </div>
        
        <h2 className="text-xl font-bold text-gray-800">Visitante</h2>
        <p className="text-gray-400 text-sm mb-4">Modo Gratuito</p>

        <div className="bg-brand-light w-full rounded-xl p-4">
            <div className="text-4xl font-black text-brand-purple mb-1">
            {user.credits}
            </div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-wide">Créditos Restantes</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Estatísticas</h3>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600 font-medium">Plano Atual:</span>
          <span className={`font-bold px-3 py-1 rounded-full text-sm ${user.isPremium ? 'bg-brand-warning text-black' : 'bg-gray-200 text-gray-600'}`}>
            {user.isPremium ? 'PREMIUM 👑' : 'GRATUITO'}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600 font-medium">Total Criado:</span>
          <span className="font-bold text-brand-purple">{user.totalGenerated} artes</span>
        </div>
      </div>
    </div>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserState } from '../types';
import { DAILY_CREDITS } from '../constants';

interface AuthContextType {
  user: UserState;
  loading: boolean;
  refreshUser: () => void;
  decrementCredit: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'estampa_magica_user_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    
    let currentUser: UserState;

    if (stored) {
      currentUser = JSON.parse(stored);
      // Reset diário de créditos
      if (currentUser.lastResetDate !== today) {
        currentUser.credits = DAILY_CREDITS;
        currentUser.lastResetDate = today;
      }
    } else {
      // Usuário novo (Visitante)
      currentUser = {
        name: 'Visitante',
        credits: DAILY_CREDITS,
        isPremium: false,
        totalGenerated: 0,
        lastResetDate: today
      };
    }

    // Salva estado atualizado
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser));
    setUser(currentUser);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const refreshUser = () => {
    loadUser();
  };

  const decrementCredit = () => {
    if (!user) return;
    const updatedUser = { 
      ...user, 
      credits: user.credits - 1, 
      totalGenerated: user.totalGenerated + 1 
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const login = async (email: string, pass: string) => {
    console.log("Login attempt", email);
  };

  const register = async (name: string, email: string, pass: string) => {
    console.log("Register attempt", name, email);
  };

  return (
    <AuthContext.Provider value={{ 
      user: user!, 
      loading, 
      refreshUser,
      decrementCredit,
      login,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
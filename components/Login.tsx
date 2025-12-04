
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, ICON_URL } from '../constants';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!name || !email || !password) {
          throw new Error("Preencha todos os campos.");
        }
        await register(name, email, password);
      } else {
        if (!email || !password) {
           throw new Error("Preencha e-mail e senha.");
        }
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border-t-8 border-brand-purple">
        <div className="text-center mb-6">
          <img src={ICON_URL} alt="Logo" className="w-20 h-20 mx-auto mb-4 rounded-full shadow-lg p-1 bg-white" />
          <h1 className="text-2xl font-black text-brand-purple">{APP_NAME}</h1>
          <p className="text-gray-500 text-sm">Crie estampas mágicas com IA</p>
        </div>

        {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-center font-bold mb-4">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegistering && (
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-1">Nome</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-brand-purple outline-none"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-brand-purple outline-none"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-brand-purple outline-none"
              placeholder="********"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-purple text-white py-3 rounded-xl font-bold text-lg hover:bg-brand-dark transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isRegistering ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-4">
          <p className="text-gray-600 text-sm mb-2">
            {isRegistering ? 'Já tem uma conta?' : 'Novo por aqui?'}
          </p>
          <button 
            onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
            }}
            className="text-brand-purple font-bold hover:underline"
          >
            {isRegistering ? 'Fazer Login' : 'Criar Conta Grátis'}
          </button>
        </div>

      </div>
    </div>
  );
};

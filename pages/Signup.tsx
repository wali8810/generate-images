import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleEmailSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError("As senhas não coincidem");
        }

        setLoading(true);
        setError('');

        try {
            await register(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Falha ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Título */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        ✨ ESTAMPA MÁGICA
                    </h1>
                    <p className="text-purple-200">Crie artes incríveis com IA</p>
                </div>

                {/* Card de Cadastro */}
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white text-center mb-6">
                        Criar Conta Grátis 🎨
                    </h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-white p-3 rounded-xl mb-4 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailSignup} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-purple-100 mb-2">
                                📧 E-mail
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-200 focus:outline-none focus:border-white focus:bg-white/20 transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-purple-100 mb-2">
                                🔒 Senha
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-200 focus:outline-none focus:border-white focus:bg-white/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-purple-100 mb-2">
                                🔒 Confirmar Senha
                            </label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-200 focus:outline-none focus:border-white focus:bg-white/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                        >
                            {loading ? 'Criando conta...' : 'Criar Conta'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-purple-100">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-white hover:text-purple-200 font-bold underline">
                            Fazer login
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-purple-200 text-xs mt-6">
                    © 2025 Estampa Mágica - Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};

export default Signup;

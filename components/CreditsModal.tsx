import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVisitor: boolean;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ isOpen, onClose, isVisitor }) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 rounded-3xl p-8 max-w-md w-full border-2 border-white/20 shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">😢</div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {isVisitor ? 'Créditos Grátis Esgotados!' : 'Sem Créditos!'}
                    </h2>
                    <p className="text-purple-200">
                        {isVisitor
                            ? 'Você usou seus 3 créditos de teste gratuitos'
                            : 'Seus créditos acabaram'}
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6">
                    {isVisitor ? (
                        <>
                            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                                <div className="flex items-start gap-3">
                                    <div className="text-3xl">🎨</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">Crie uma Conta Grátis</h3>
                                        <p className="text-sm text-purple-200">
                                            Cadastre-se e ganhe acesso ao painel de controle
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                                <div className="flex items-start gap-3">
                                    <div className="text-3xl">💎</div>
                                    <div>
                                        <h3 className="font-bold text-white mb-1">Plano Diário - R$ 14,90/mês</h3>
                                        <p className="text-sm text-purple-200">
                                            10 créditos renovados automaticamente todo dia
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                            <div className="flex items-start gap-3">
                                <div className="text-3xl">💳</div>
                                <div>
                                    <h3 className="font-bold text-white mb-1">Assine o Plano Diário</h3>
                                    <p className="text-sm text-purple-200">
                                        Por apenas R$ 14,90/mês tenha 10 créditos renovados todo dia
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    {isVisitor ? (
                        <>
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/signup');
                                }}
                                className="w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
                            >
                                Criar Conta Grátis
                            </button>
                            <button
                                onClick={() => {
                                    onClose();
                                    // TODO: Navegar para página de planos
                                    alert('Em breve: página de planos e pagamento!');
                                }}
                                className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition-all"
                            >
                                Ver Planos
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => {
                                onClose();
                                // TODO: Navegar para página de planos
                                alert('Em breve: página de planos e pagamento!');
                            }}
                            className="w-full bg-white text-purple-700 font-bold py-3 px-4 rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105 shadow-lg"
                        >
                            Assinar Plano Diário
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-transparent text-white font-medium py-2 px-4 rounded-xl hover:bg-white/10 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

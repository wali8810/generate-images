import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface UserData {
    id: number;
    email: string;
    name: string;
    credits: number;
    role: string;
    status: string;
    created_at: string;
    plan_type: string;
    subscription_status: string;
    subscription_renewal: string;
}

export const AdminPanel: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState<UserData | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');
    const token = localStorage.getItem('estampa_magica_token');

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch users');

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                setUsers(data);
            } else {
                throw new Error("Resposta inválida do servidor (HTML recebido). Backend pode estar offline.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    const handleAddCredits = async (userId: number, currentCredits: number) => {
        const amount = prompt("Quantos créditos deseja adicionar? (Use negativo para remover)", "10");
        if (!amount) return;

        const newCredits = Number(currentCredits) + parseInt(amount);

        try {
            await fetch(`${API_URL}/admin/users/${userId}/credits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ credits: newCredits })
            });
            fetchUsers();
        } catch (err) {
            alert("Erro ao atualizar créditos");
        }
    };

    const handleUpdateUser = async (user: UserData) => {
        try {
            await fetch(`${API_URL}/admin/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plan_type: user.plan_type,
                    subscription_status: user.subscription_status,
                    subscription_renewal: user.subscription_renewal,
                    status: user.status
                })
            });
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            alert("Erro ao atualizar usuário");
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

        try {
            await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchUsers();
        } catch (err) {
            alert("Erro ao excluir usuário");
        }
    };

    if (!isAdmin) return <div className="p-8 text-center text-red-500">Acesso Negado</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 pb-24">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">
                            <i className="fa-solid fa-user-shield text-brand-purple mr-3"></i>
                            Painel Administrativo
                        </h1>
                    </div>
                    <div className="bg-brand-purple text-white px-4 py-2 rounded-lg font-bold">
                        Modo Deus Ativado ⚡
                    </div>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="p-4 font-bold text-gray-600">Usuário</th>
                                    <th className="p-4 font-bold text-gray-600">Plano</th>
                                    <th className="p-4 font-bold text-gray-600">Pagamento</th>
                                    <th className="p-4 font-bold text-gray-600">Renovação</th>
                                    <th className="p-4 font-bold text-gray-600">Créditos</th>
                                    <th className="p-4 font-bold text-gray-600 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{user.name || 'Sem nome'}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </td>
                                        <td className="p-4">
                                            {editingUser?.id === user.id ? (
                                                <select
                                                    className="border rounded p-1 text-sm"
                                                    value={editingUser.plan_type || 'free'}
                                                    onChange={e => setEditingUser({ ...editingUser, plan_type: e.target.value })}
                                                >
                                                    <option value="free">Grátis</option>
                                                    <option value="daily">Diário (10/dia)</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.plan_type === 'daily' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {user.plan_type === 'daily' ? 'Diário' : 'Grátis'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {editingUser?.id === user.id ? (
                                                <select
                                                    className="border rounded p-1 text-sm"
                                                    value={editingUser.subscription_status || 'inactive'}
                                                    onChange={e => setEditingUser({ ...editingUser, subscription_status: e.target.value })}
                                                >
                                                    <option value="active">Ativo</option>
                                                    <option value="pending">Pendente</option>
                                                    <option value="overdue">Atrasado</option>
                                                    <option value="cancelled">Cancelado</option>
                                                    <option value="inactive">Inativo</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                    ${user.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                                                        user.subscription_status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'}`}>
                                                    {user.subscription_status === 'active' ? 'Em dia' :
                                                        user.subscription_status === 'overdue' ? 'Atrasado' :
                                                            user.subscription_status === 'pending' ? 'Pendente' : 'Inativo'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {editingUser?.id === user.id ? (
                                                <input
                                                    type="date"
                                                    className="border rounded p-1 text-sm"
                                                    value={editingUser.subscription_renewal || ''}
                                                    onChange={e => setEditingUser({ ...editingUser, subscription_renewal: e.target.value })}
                                                />
                                            ) : (
                                                user.subscription_renewal ? new Date(user.subscription_renewal).toLocaleDateString() : '-'
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-bold ${user.credits > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {user.credits}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            {editingUser?.id === user.id ? (
                                                <>
                                                    <button onClick={() => handleUpdateUser(editingUser)} className="text-green-600 hover:bg-green-50 p-2 rounded"><i className="fa-solid fa-check"></i></button>
                                                    <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:bg-gray-100 p-2 rounded"><i className="fa-solid fa-xmark"></i></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => setEditingUser(user)} className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200" title="Editar Plano">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                    <button onClick={() => handleAddCredits(user.id, user.credits)} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200" title="Adicionar Créditos">
                                                        <i className="fa-solid fa-coins"></i>
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.id)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200" title="Excluir">
                                                        <i className="fa-solid fa-trash"></i>
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


import React, { useState, useEffect } from 'react';
import { CommunityPost, GeneratedImage } from '../types';
import { getCommunityFeed, hasUserLiked, togglePostLike } from '../services/communityService';
import { STICKER_CATEGORIES, PRESETS } from '../constants';

interface CommunityProps {
    onInspire: (img: GeneratedImage) => void;
}

export const Community: React.FC<CommunityProps> = ({ onInspire }) => {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<CommunityPost[]>([]);
    const [filter, setFilter] = useState('Recentes');
    const [categoryFilter, setCategoryFilter] = useState('Todas');
    const [likedPosts, setLikedPosts] = useState<string[]>([]);

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = () => {
        const feed = getCommunityFeed();
        setPosts(feed);
        // Atualiza lista de likes do usuário
        const userLikes = feed.filter(p => hasUserLiked(p.id)).map(p => p.id);
        setLikedPosts(userLikes);
    };

    useEffect(() => {
        let result = [...posts];

        // Filtro de Categoria
        if (categoryFilter !== 'Todas') {
            result = result.filter(p => p.category.includes(categoryFilter));
        }

        // Ordenação
        if (filter === 'Recentes') {
            result.sort((a, b) => b.createdAt - a.createdAt);
        } else if (filter === 'Populares') {
            result.sort((a, b) => b.likes - a.likes);
        }

        setFilteredPosts(result);
    }, [posts, filter, categoryFilter]);

    const handleLike = (postId: string) => {
        const newCount = togglePostLike(postId);
        
        // Atualiza UI localmente
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newCount } : p));
        
        if (likedPosts.includes(postId)) {
            setLikedPosts(prev => prev.filter(id => id !== postId));
        } else {
            setLikedPosts(prev => [...prev, postId]);
        }
    };

    const handleInspire = (post: CommunityPost) => {
        const img: GeneratedImage = {
            id: Date.now().toString(),
            data: post.imageUrl,
            prompt: "Inspirado na Comunidade",
            presetName: "Comunidade",
            createdAt: Date.now(),
            tags: ['comunidade']
        };
        onInspire(img);
    };

    const weeklyStar = posts.find(p => p.isWeeklyStar);

    return (
        <div className="pb-24 bg-gray-50 min-h-screen">
            
            {/* Header / Filtros */}
            <div className="sticky top-0 bg-white z-40 shadow-sm pt-4 pb-2 px-4">
                <h2 className="text-2xl font-black text-brand-purple mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-users"></i> Comunidade
                </h2>
                
                {/* Filtros Principais */}
                <div className="flex gap-2 mb-4">
                    {['Recentes', 'Populares'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-2 rounded-xl font-bold text-sm border-2 ${filter === f ? 'bg-brand-purple text-white border-brand-purple' : 'bg-white text-gray-500 border-gray-200'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Filtros Categoria */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setCategoryFilter('Todas')} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${categoryFilter === 'Todas' ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-600'}`}>
                        Todas
                    </button>
                    {PRESETS.map(p => (
                         <button key={p.id} onClick={() => setCategoryFilter(p.label)} className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${categoryFilter === p.label ? 'bg-brand-purple text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 max-w-lg mx-auto space-y-6">
                
                {/* Arte da Semana */}
                {weeklyStar && categoryFilter === 'Todas' && filter === 'Recentes' && (
                    <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-2xl p-1 border-4 border-yellow-300 shadow-xl mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-br-xl shadow z-10">
                            🌟 ARTE DA SEMANA
                        </div>
                        <div className="bg-white rounded-xl overflow-hidden relative">
                             <img src={weeklyStar.imageUrl} className="w-full h-64 object-contain bg-[url('https://www.transparenttextures.com/patterns/checkerboard-white-gray.png')]" />
                             <div className="p-3 flex justify-between items-center bg-white">
                                <div className="flex items-center gap-2 text-yellow-600 font-bold text-xl">
                                    <i className="fa-solid fa-heart"></i> {weeklyStar.likes}
                                </div>
                                <button onClick={() => handleInspire(weeklyStar)} className="bg-brand-purple text-white px-4 py-2 rounded-xl font-bold shadow animate-pulse">
                                    <i className="fa-solid fa-wand-magic-sparkles"></i> Inspirar-se
                                </button>
                             </div>
                        </div>
                    </div>
                )}

                {/* Feed */}
                <div className="space-y-6">
                    {filteredPosts.map(post => (
                        <div key={post.id} className="bg-white rounded-3xl shadow-md overflow-hidden border border-gray-100">
                            <div className="p-3 flex items-center justify-between border-b border-gray-50">
                                <span className="bg-purple-100 text-brand-purple text-xs font-bold px-3 py-1 rounded-full">
                                    {post.category}
                                </span>
                                <span className="text-gray-300 text-xs">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            
                            <div className="relative aspect-square bg-gray-50">
                                <img src={post.imageUrl} className="w-full h-full object-contain p-2" loading="lazy" />
                            </div>

                            <div className="p-4 flex items-center justify-between bg-white">
                                <button 
                                    onClick={() => handleLike(post.id)}
                                    className={`flex items-center gap-2 text-xl font-black transition-transform active:scale-90 ${likedPosts.includes(post.id) ? 'text-red-500' : 'text-gray-300'}`}
                                >
                                    <i className={`${likedPosts.includes(post.id) ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
                                    <span>{post.likes}</span>
                                </button>

                                <button 
                                    onClick={() => handleInspire(post)}
                                    className="bg-gray-100 text-gray-600 hover:bg-brand-purple hover:text-white transition-colors px-4 py-3 rounded-2xl font-bold flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    <span className="text-sm">Inspirar-se</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {filteredPosts.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <i className="fa-solid fa-ghost text-4xl mb-2"></i>
                            <p>Nenhuma arte encontrada nesta categoria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

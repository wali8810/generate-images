
import { CommunityPost, GeneratedImage } from '../types';
import { moderateImage } from './geminiService';

const STORAGE_KEY_COMMUNITY = 'estampa_magica_community_real_v2';
const STORAGE_KEY_LIKES = 'estampa_magica_user_likes';

// Compressão de imagem para JPEG (Qualidade 50% para garantir espaço)
const compressImage = (base64Str: string, maxWidth = 500): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str) {
            resolve("");
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleSize = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str);
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Qualidade 0.5 para reduzir drasticamente o tamanho (ex: 2MB -> 50KB)
            resolve(canvas.toDataURL('image/jpeg', 0.5)); 
        };
        img.onerror = () => {
            console.warn("Falha ao comprimir imagem, tentando salvar original...");
            resolve(base64Str);
        }
    });
};

export const getCommunityFeed = (): CommunityPost[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY);
        if (!stored) return [];

        const posts: CommunityPost[] = JSON.parse(stored);
        const sortedPosts = posts.sort((a, b) => b.createdAt - a.createdAt);
        
        let maxLikes = 0;
        if (sortedPosts.length > 0) {
            maxLikes = Math.max(...sortedPosts.map((p) => p.likes));
        }
        
        return sortedPosts.map((p) => ({
            ...p,
            isWeeklyStar: maxLikes > 0 && p.likes === maxLikes
        }));
    } catch (error) {
        console.error("Erro ao carregar feed:", error);
        return [];
    }
};

export const publishToCommunity = async (image: GeneratedImage): Promise<{success: boolean, message: string}> => {
    // Validação
    if (!image || !image.data) {
        return { success: false, message: "❌ Erro: Imagem inválida." };
    }

    // 1. Moderação via IA
    let isAllowed = true; 
    try {
        isAllowed = await moderateImage(image.data);
    } catch (e) {
        console.warn("Moderação offline ou com erro. Permitindo publicação por padrão.", e);
        isAllowed = true; // Fail-Open: Se a IA falhar, permite a publicação
    }
    
    if (!isAllowed) {
        return { success: false, message: "🚫 Arte não permitida. A comunidade aceita apenas ilustrações e vetores." };
    }

    let newPost: CommunityPost | null = null;

    try {
        // 2. Compressão (Essencial)
        const compressedImage = await compressImage(image.data);
        if (!compressedImage) {
             return { success: false, message: "❌ Erro ao processar imagem para envio." };
        }

        // 3. Objeto do Post
        newPost = {
            id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: compressedImage, 
            likes: 0,
            category: image.presetName || 'Geral',
            createdAt: Date.now()
        };

        // 4. Salvar
        const stored = localStorage.getItem(STORAGE_KEY_COMMUNITY);
        let posts: CommunityPost[] = stored ? JSON.parse(stored) : [];
        
        posts.unshift(newPost);
        
        // Limite de 12 posts para garantir que cabe no LocalStorage
        if (posts.length > 12) {
            posts = posts.slice(0, 12);
        }

        localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(posts));
        return { success: true, message: "✅ Arte publicada com sucesso na Comunidade!" };

    } catch (error: any) {
        console.error("Erro FATAL ao salvar:", error);
        
        if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
            // Recuperação: Limpa tudo e tenta salvar de novo
            try {
                localStorage.removeItem(STORAGE_KEY_COMMUNITY);
                
                const recoveryImageUrl = await compressImage(image.data, 300); // Tenta ainda menor
                
                const recoveryPost: CommunityPost = {
                     id: newPost?.id || `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                     imageUrl: recoveryImageUrl,
                     likes: 0,
                     category: newPost?.category || image.presetName || 'Geral',
                     createdAt: newPost?.createdAt || Date.now()
                };

                localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify([recoveryPost]));
                return { success: true, message: "✅ Publicado! (Cache antigo foi limpo)" };
            } catch (e) {
                return { success: false, message: "⚠️ Memória cheia. Não foi possível publicar." };
            }
        }
        
        return { success: false, message: "Erro interno ao salvar." };
    }
};

export const togglePostLike = (postId: string): number => {
    const storedLikes = localStorage.getItem(STORAGE_KEY_LIKES);
    let userLikes = storedLikes ? JSON.parse(storedLikes) : [];
    
    const hasLiked = userLikes.includes(postId);
    
    const storedCommunity = localStorage.getItem(STORAGE_KEY_COMMUNITY);
    if (!storedCommunity) return 0;

    let localPosts: CommunityPost[] = JSON.parse(storedCommunity);
    let newLikesCount = 0;

    localPosts = localPosts.map((p) => {
        if (p.id === postId) {
            newLikesCount = hasLiked ? Math.max(0, p.likes - 1) : p.likes + 1;
            return { ...p, likes: newLikesCount };
        }
        return p;
    });

    localStorage.setItem(STORAGE_KEY_COMMUNITY, JSON.stringify(localPosts));

    if (hasLiked) {
        userLikes = userLikes.filter((id: string) => id !== postId);
    } else {
        userLikes.push(postId);
    }
    localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(userLikes));

    return newLikesCount;
};

export const hasUserLiked = (postId: string): boolean => {
    const storedLikes = localStorage.getItem(STORAGE_KEY_LIKES);
    const userLikes = storedLikes ? JSON.parse(storedLikes) : [];
    return userLikes.includes(postId);
};

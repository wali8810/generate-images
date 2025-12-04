import { GeneratedImage } from '../types';

// Atualização de versão para forçar limpeza de caches antigos/corrompidos
const STORAGE_KEY_LIBRARY = 'estampa_magica_library_v4';

// Compressão agressiva para Mobile (JPEG 0.5)
const compressImage = (base64Str: string, quality = 0.5, maxWidth = 600): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64Str) {
            resolve("");
            return;
        }
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            
            let width = img.width;
            let height = img.height;
            
            // Redimensionamento forçado para garantir que caiba na memória
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Str);
                return;
            }
            
            // Fundo branco para JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Retorna JPEG leve
            resolve(canvas.toDataURL('image/jpeg', quality)); 
        };
        img.onerror = () => resolve(base64Str);
    });
};

export const getLibrary = (): GeneratedImage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LIBRARY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (e) {
    console.error("Erro ao ler biblioteca:", e);
    return [];
  }
};

export const saveToLibrary = async (image: GeneratedImage): Promise<void> => {
  try {
    // 1. Compressão
    const compressedData = await compressImage(image.data);
    if (!compressedData) throw new Error("Falha na compressão da imagem.");

    const optimizedImage = { ...image, data: compressedData };

    // 2. Recupera biblioteca atual
    let lib = getLibrary();
    
    // 3. Adiciona nova imagem no topo
    let newLib = [optimizedImage, ...lib];

    // 4. Limite Hard: Mantém no máximo 15 itens recentes para evitar estouro
    if (newLib.length > 15) {
        newLib = newLib.slice(0, 15);
    }

    // 5. Tentativa de Salvamento com Fallback (FIFO)
    const trySave = (data: GeneratedImage[]) => {
        try {
            localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(data));
            return true;
        } catch (e: any) {
            // Verifica erro de cota
            if (e.name === 'QuotaExceededError' || e.code === 22 || e.message?.toLowerCase().includes('quota')) {
                return false;
            }
            throw e;
        }
    };

    // Enquanto não conseguir salvar, remove o item mais antigo (do final do array)
    while (!trySave(newLib)) {
        if (newLib.length <= 1) {
            // Se só tem a imagem nova e ainda não cabe, tenta limpar TUDO e salvar só ela
            localStorage.removeItem(STORAGE_KEY_LIBRARY);
            // Se falhar aqui, é porque a imagem única é maior que a memória do navegador (raro com compressão)
            if (!trySave([optimizedImage])) {
                throw new Error("Memória do dispositivo cheia. Não foi possível salvar a imagem.");
            }
            return;
        }
        newLib.pop(); // Remove o último (mais antigo) e tenta de novo
    }

  } catch (err) {
    console.error("Erro fatal ao salvar:", err);
    throw err; // Repassa o erro para o Generator exibir a mensagem
  }
};

export const removeFromLibrary = (id: string) => {
  try {
    const lib = getLibrary();
    const newLib = lib.filter(img => img.id !== id);
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(newLib));
  } catch (e) {
    console.error("Erro ao remover:", e);
  }
};

export const toggleFavorite = (id: string) => {
  try {
    const lib = getLibrary();
    const newLib = lib.map(img => 
        img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
    );
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(newLib));
    return newLib;
  } catch (e) {
    return [];
  }
};
import { GeneratedImage } from '../types';

// Mudança de versão na chave para garantir limpeza de dados antigos pesados se necessário
const STORAGE_KEY_LIBRARY = 'estampa_magica_library_v4';

// Helper to compress image before saving
// Converts PNG (heavy) to JPEG (light) with 50% quality
// This is critical for mobile devices with limited LocalStorage (~5MB)
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

      // Calculate new size maintaining aspect ratio
      let width = img.width;
      let height = img.height;

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

      // White background for JPEG (since JPEG doesn't support transparency)
      // This saves massive space. The original generation remains available if needed immediately,
      // but for library storage, JPEG is essential for mobile.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Export as JPEG to save massive space (LocalStorage limit is ~5MB)
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback
  });
};

export const getLibrary = (): GeneratedImage[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LIBRARY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error loading library", e);
    return [];
  }
};

export const saveToLibrary = async (image: GeneratedImage): Promise<void> => {
  try {
    // 1. Compress Image (Critical for Mobile Storage)
    const compressedData = await compressImage(image.data);

    // Check if compression failed or resulted in empty string
    if (!compressedData || compressedData.length < 100) {
      console.error("Compression failed, using original");
      // Only use original if really needed, though it might crash storage
    } else {
      image.data = compressedData;
    }

    const lib = getLibrary();
    // Add new image to the front
    let newLib = [image, ...lib];

    // 2. Safe Save Loop (FIFO - First In First Out)
    const save = (data: GeneratedImage[]) => {
      try {
        localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(data));
        return true;
      } catch (e: any) {
        // Check for quota exceeded errors
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.message?.toLowerCase().includes('quota')) {
          return false;
        }
        throw e;
      }
    };

    // Try saving. If full, remove oldest items until it fits.
    // This loop guarantees we never crash due to full storage.
    let attempts = 0;
    while (!save(newLib) && newLib.length > 0 && attempts < 50) {
      // Remove the oldest image (last in array)
      newLib.pop();
      attempts++;
    }

    if (newLib.length === 0 && image.data) {
      // Extreme case: even one image didn't fit (very unlikely with compression)
      // Clear everything and try to save just the new one
      localStorage.removeItem(STORAGE_KEY_LIBRARY);
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify([image]));
    }

  } catch (err) {
    console.error("Storage Critical Error:", err);
    throw new Error("Não foi possível salvar na galeria. Tente limpar artes antigas.");
  }
};

export const removeFromLibrary = (id: string) => {
  try {
    const lib = getLibrary();
    const newLib = lib.filter(img => img.id !== id);
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(newLib));
  } catch (e) {
    console.error("Error removing item", e);
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
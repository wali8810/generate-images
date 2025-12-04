
import React, { useEffect, useState } from 'react';
import { getLibrary, removeFromLibrary, toggleFavorite } from '../services/storageService';
import { GeneratedImage } from '../types';

interface LibraryProps {
    onEdit: (img: GeneratedImage) => void;
}

export const Library: React.FC<LibraryProps> = ({ onEdit }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<GeneratedImage[]>([]);
  const [selectedImg, setSelectedImg] = useState<GeneratedImage | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFav, setFilterFav] = useState(false);

  useEffect(() => {
    setImages(getLibrary());
  }, []);

  useEffect(() => {
    let result = [...images];
    if (filterFav) result = result.filter(img => img.isFavorite);
    if (searchTerm) result = result.filter(img => img.prompt.toLowerCase().includes(searchTerm.toLowerCase()));
    result.sort((a, b) => b.createdAt - a.createdAt);
    setFilteredImages(result);
  }, [images, searchTerm, filterFav]);

  const handleDelete = (id: string) => {
    if (confirm("Apagar?")) {
      removeFromLibrary(id);
      setImages(getLibrary());
      setSelectedImg(null);
    }
  };

  const handleToggleFav = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      toggleFavorite(id);
      setImages(getLibrary());
  };

  const handleShare = async () => {
      if(!selectedImg) return;
      const text = `Olha essa arte que criei no Estampa Mágica: ${selectedImg.prompt}`;
      try {
          const base64Response = await fetch(selectedImg.data);
          const blob = await base64Response.blob();
          const file = new File([blob], "estampa_magica_arte.png", { type: 'image/png' });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                  title: 'Minha Estampa Mágica',
                  text: text,
                  files: [file]
              });
          } else {
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              const link = document.createElement('a');
              link.href = selectedImg.data;
              link.download = 'estampa.png';
              link.click();
          }
      } catch (error) {
          console.error("Erro ao compartilhar:", error);
          alert("Não foi possível compartilhar a imagem diretamente.");
      }
  };

  return (
    <div className="p-4 max-w-lg mx-auto pb-24">
      <div className="mb-6 space-y-3">
          <h2 className="text-2xl font-bold text-gray-700">Biblioteca</h2>
          <div className="flex gap-2">
            <input type="text" placeholder="Buscar..." className="flex-1 px-4 py-2 rounded-xl border" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <button onClick={() => setFilterFav(!filterFav)} className={`px-3 rounded-xl border ${filterFav ? 'bg-yellow-100 border-yellow-400' : 'bg-white'}`}><i className="fa-solid fa-star text-yellow-500"></i></button>
          </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
          {filteredImages.map((img) => (
            <div key={img.id} className="bg-white rounded-xl shadow-md overflow-hidden aspect-square border relative" onClick={() => setSelectedImg(img)}>
              <button onClick={(e) => handleToggleFav(e, img.id)} className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                  <i className={`fa-star ${img.isFavorite ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-400'}`}></i>
              </button>
              <img src={img.data} className="w-full h-full object-contain p-2 bg-[url('https://www.transparenttextures.com/patterns/checkerboard-white-gray.png')]" />
            </div>
          ))}
      </div>

      {selectedImg && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImg(null)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <img src={selectedImg.data} className="w-full h-auto max-h-[300px] object-contain mx-auto border mb-4 bg-gray-100" />
            
            <div className="grid grid-cols-2 gap-2">
               {/* Linha 1 */}
               <button onClick={() => { setSelectedImg(null); onEdit(selectedImg); }} className="bg-yellow-400 text-yellow-900 font-bold py-3 rounded-xl"><i className="fa-solid fa-wand-magic-sparkles"></i> Editar</button>
               <button onClick={handleShare} className="bg-green-500 text-white font-bold py-3 rounded-xl"><i className="fa-brands fa-whatsapp"></i> Zap</button>
               
               {/* Linha 2 */}
               <button onClick={() => handleDelete(selectedImg.id)} className="bg-red-100 text-red-600 font-bold py-3 rounded-xl"><i className="fa-solid fa-trash"></i></button>
               <a href={selectedImg.data} download="arte.png" className="bg-brand-purple text-white font-bold py-3 rounded-xl flex items-center justify-center"><i className="fa-solid fa-download"></i> Baixar</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

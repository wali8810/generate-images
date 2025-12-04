
export interface GeneratedImage {
  id: string;
  data: string; // base64
  prompt: string;
  presetName: string;
  createdAt: number;
  tags: string[];
  isFavorite?: boolean;
}

export interface UserState {
  name: string;
  credits: number;
  isPremium: boolean;
  totalGenerated: number;
  lastResetDate: string;
  hasSeenTutorial?: boolean;
}

export interface Preset {
  id: string;
  label: string;
  promptSuffix: string; 
  icon: string; 
}

export type View = 'generator' | 'library' | 'profile' | 'creative';

// Tipos para o Modo Criativo
export interface EditorElement {
  id: string;
  type: 'sticker' | 'text';
  content: string; // URL ou texto
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color?: string;
  font?: string;
  isLocked?: boolean;
  zIndex: number;
}

export interface HistoryState {
  bg: string | null;
  elements: EditorElement[];
  filter: string;
}

export interface Template {
    id: string;
    name: string;
    bgUrl: string;
    elements: EditorElement[];
}

export interface Mockup {
    id: string;
    name: string;
    image: string; // URL da imagem do produto em branco
    overlayArea: { top: number, left: number, width: number, height: number }; // Área onde a arte vai
    prompt?: string;
}

export interface CommunityPost {
    id: string;
    imageUrl: string;
    likes: number;
    category: string;
    createdAt: number;
    isWeeklyStar?: boolean;
}

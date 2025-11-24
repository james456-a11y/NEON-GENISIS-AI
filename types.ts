export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  CREATION = 'CREATION',
  AUDIO_LAB = 'AUDIO_LAB'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string; // base64
  videoUrl?: string;
  audioUrl?: string;
  isThinking?: boolean;
  groundingLinks?: Array<{title: string, uri: string}>;
}

export enum ImageRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  MOBILE = '9:16',
  PORTRAIT_ALT = '2:3',
  LANDSCAPE_ALT = '3:2',
  CINEMATIC = '21:9'
}

export enum ImageSize {
  K1 = '1K',
  K2 = '2K',
  K4 = '4K'
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}
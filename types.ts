
export type AppState = 'idle' | 'uploading' | 'processing' | 'ready';

export interface ImageFile {
  original: string;
  processed?: string;
  name: string;
}

export interface BgSettings {
  mode: 'transparent' | 'color' | 'image';
  color: string;
  imageUrl?: string;
}

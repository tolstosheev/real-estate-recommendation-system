import type { YMaps3Global } from '@shared/api/ymaps3';

declare global {
  interface Window {
    ymaps3: YMaps3Global;
  }
  const ymaps3: YMaps3Global;
}

export {};

import type { YMaps3Global } from '@shared/api/ymaps3';

declare global {
  interface Window {
    ymaps3: YMaps3Global;
  }
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_YANDEX_MAPS_API_KEY: string;
    readonly VITE_YANDEX_GEOCODER_API_KEY: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};

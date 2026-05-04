import React from 'react';
import ReactDOM from 'react-dom/client';

export interface YMaps3Global {
  import: (moduleName: string) => Promise<unknown>;
  ready: Promise<void>;
}

interface YMaps3Reactify {
  reactify: {
    bindTo: (react: unknown, reactDom: unknown) => {
      module: (ymaps3: YMaps3Global) => Record<string, React.ElementType>;
    };
  };
}

let ymapsPromise: Promise<Record<string, React.ElementType>> | null = null;

function loadYandexMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
      resolve();
      return;
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error('VITE_YANDEX_MAPS_API_KEY is not set'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Yandex Maps script'));
    document.head.appendChild(script);
  });
}

async function initYmaps(): Promise<Record<string, React.ElementType>> {
  const ymaps3 = window.ymaps3;
  if (!ymaps3) {
    await loadYandexMapsScript();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const ymaps3Final = window.ymaps3;
  if (!ymaps3Final) {
    throw new Error('Yandex Maps API script not loaded. Please check your API key.');
  }
  
  const [ymaps3React] = await Promise.all([
    ymaps3Final.import('@yandex/ymaps3-reactify'), 
    ymaps3Final.ready
  ]);
  
  const reactify = (ymaps3React as YMaps3Reactify).reactify.bindTo(React, ReactDOM);
  return reactify.module(ymaps3Final);
}

export const getYmapsComponents = async (): Promise<Record<string, React.ElementType>> => {
  if (!ymapsPromise) {
    ymapsPromise = initYmaps();
  }
  return ymapsPromise;
};

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

async function initYmaps() {
  const ymaps3 = window.ymaps3;
  if (!ymaps3) {
    throw new Error('Yandex Maps API script not loaded. Please check index.html');
  }
  
  const [ymaps3React] = await Promise.all([
    ymaps3.import('@yandex/ymaps3-reactify'), 
    ymaps3.ready
  ]);
  
  const reactify = (ymaps3React as YMaps3Reactify).reactify.bindTo(React, ReactDOM);
  return reactify.module(ymaps3);
}

export const getYmapsComponents = async () => {
  return await initYmaps();
};

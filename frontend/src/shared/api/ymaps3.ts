import React from 'react';
import ReactDOM from 'react-dom/client';

async function initYmaps() {
  if (!(window as any).ymaps3) {
    throw new Error('Yandex Maps API script not loaded. Please check index.html');
  }
  
  const ymaps3 = (window as any).ymaps3;
  const [ymaps3React] = await Promise.all([
    ymaps3.import('@yandex/ymaps3-reactify'), 
    ymaps3.ready
  ]);

  const reactify = ymaps3React.reactify.bindTo(React, ReactDOM);
  return reactify.module(ymaps3);
}

export const getYmapsComponents = async () => {
  return await initYmaps();
};

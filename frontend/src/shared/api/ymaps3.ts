import React from 'react';
import ReactDOM from 'react-dom';

export interface YMaps3Global {
  ready: Promise<void>;
  import: (module: string) => Promise<unknown>;
}

interface YMapsComponents {
  YMap: React.ElementType;
  YMapDefaultSchemeLayer: React.ElementType;
  YMapDefaultFeaturesLayer: React.ElementType;
  YMapMarker: React.ElementType;
  YMapListener: React.ElementType;
  reactify: { useDefault: (value: unknown, deps?: unknown[]) => unknown };
}

let ymapsPromise: Promise<YMapsComponents> | null = null;

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

async function initYmaps(): Promise<YMapsComponents> {
  if (!window.ymaps3) {
    await loadYandexMapsScript();
  }

  const ymaps3 = window.ymaps3;
  await ymaps3.ready;

  const [ymaps3Reactify] = await Promise.all([
    ymaps3.import('@yandex/ymaps3-reactify'),
    ymaps3.import('@yandex/ymaps3-default-ui-theme').catch(() => {}),
  ]);
  const reactify = ymaps3Reactify.reactify.bindTo(React, ReactDOM);
  const components = reactify.module(ymaps3);

  return {
    YMap: components.YMap,
    YMapDefaultSchemeLayer: components.YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer: components.YMapDefaultFeaturesLayer,
    YMapMarker: components.YMapMarker,
    YMapListener: components.YMapListener,
    reactify,
  };
}

export const getYmapsComponents = async (): Promise<YMapsComponents> => {
  if (!ymapsPromise) {
    ymapsPromise = initYmaps();
  }
  return ymapsPromise;
};

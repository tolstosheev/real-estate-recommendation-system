import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@app/store/store';
import './app/styles/global.scss';
import { InitApp } from './components/InitApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <InitApp />
    </Provider>
  </StrictMode>,
);

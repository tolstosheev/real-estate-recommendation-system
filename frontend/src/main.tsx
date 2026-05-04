import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from '@app/store/store';
import { setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import './app/styles/global.scss';
import App from './App';

const InitApp: React.FC = () => {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authService.getCurrentUser()
        .then((user) => {
          store.dispatch(setCredentials({ user: user, token: token }));
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        });
    }
  }, []);

  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <InitApp />
    </Provider>
  </StrictMode>,
);

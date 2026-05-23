import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout, setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import { getAccessToken, setAccessToken } from '@shared/lib/tokenService';
import App from '../App';

export const InitApp: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const controller = new AbortController();
    const token = getAccessToken();
    if (token && !user) {
      authService.getCurrentUser(controller.signal)
        .then((userData) => {
          dispatch(setCredentials({ user: userData, token }));
        })
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED') return;
          setAccessToken(null);
          dispatch(logout());
        });
    }
    return () => controller.abort();
  }, [dispatch, user]);

  return <App />;
};

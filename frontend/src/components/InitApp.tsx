import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import App from '../App';

export const InitApp: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      authService.getCurrentUser()
        .then((userData) => {
          dispatch(setCredentials({ user: userData, token }));
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        });
    }
  }, [dispatch, user]);

  return <App />;
};

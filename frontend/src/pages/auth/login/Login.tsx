import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@app/store/hooks';
import { setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import './Login.scss';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await authService.login({ email, password });
      dispatch(setCredentials({ user: data.user, token: data.access_token }));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">nestAI</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
          <div className="login-form__group">
            <label className="login-form__label">Email</label>
            <input 
              type="email" 
              className="login-form__input" 
              placeholder="example@mail.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="login-form__group">
            <label className="login-form__label">Password</label>
            <input 
              type="password" 
              className="login-form__input" 
              placeholder="********" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-form__submit">
            Sign In
          </button>
        </form>
        <div className="login-card__footer">
          Don't have an account? <a href="/register" className="login-card__link">Register</a>
        </div>
      </div>
    </div>
  );
};

export default Login;

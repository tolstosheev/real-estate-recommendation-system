import React, {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useAppDispatch} from '@app/store/hooks';
import {setCredentials} from '@entities/user/model/slice';
import {authService} from '@shared/api/auth.service';
import AuthLayout from '@shared/ui/AuthLayout';
import Input from '@shared/ui/Input';
import Button from '@shared/ui/Button';
import type {AxiosError} from 'axios';
import './Login.scss';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await authService.login({ email, password });
      localStorage.setItem('accessToken', data.access_token);
      const currentUser = await authService.getCurrentUser();
      dispatch(setCredentials({ user: currentUser, token: data.access_token }));
      navigate('/');
    } catch (err) {
      const error = err as AxiosError<{ detail: string | string[] }>;
      const message = error.response?.data?.detail;
      if (typeof message === 'string') {
        setError(message);
      } else if (Array.isArray(message)) {
        setError(message[0] || 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="nestAI" 
      footer={<>Don't have an account? <Link to="/register" className="auth-link">Register</Link></>}
    >
      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div className="login-form__error">{error}</div>}
        <Input 
          label="Email" 
          type="email" 
          placeholder="example@mail.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="********" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="login-form__submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
      <div className="login-form__divider">
        <span className="login-form__divider-line" />
        <span className="login-form__divider-text">or</span>
        <span className="login-form__divider-line" />
      </div>
      <button className="login-form__guest" onClick={() => navigate('/map')}>
        Continue without account
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>
    </AuthLayout>
  );
};

export default Login;


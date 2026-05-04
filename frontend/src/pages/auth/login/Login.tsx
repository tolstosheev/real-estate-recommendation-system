import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '@app/store/hooks';
import { setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import AuthLayout from '@shared/ui/AuthLayout';
import Input from '@shared/ui/Input';
import Button from '@shared/ui/Button';
import type { AxiosError } from 'axios';
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
        <Button type="submit" className="login-form__submit">
          Sign In
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;


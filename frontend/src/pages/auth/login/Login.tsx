import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@app/store/hooks';
import { setCredentials } from '@entities/user/model/slice';
import { authService } from '@shared/api/auth.service';
import AuthLayout from '@shared/ui/AuthLayout';
import Input from '@shared/ui/Input';
import Button from '@shared/ui/Button';
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
    <AuthLayout 
      title="nestAI" 
      footer={<>Don't have an account? <a href="/register" className="auth-link">Register</a></>}
    >
      <form className="login-form" onSubmit={handleSubmit}>
        {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}
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


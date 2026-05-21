import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@shared/api/auth.service';
import { useAppDispatch } from '@app/store/hooks';
import { setCredentials } from '@entities/user/model/slice';
import AuthLayout from '@shared/ui/AuthLayout';
import Input from '@shared/ui/Input';
import Button from '@shared/ui/Button';
import type { AxiosError } from 'axios';
import './Register.scss';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await authService.register(formData);
      const loginData = await authService.login({ 
        email: formData.email, 
        password: formData.password 
      });

      localStorage.setItem('accessToken', loginData.access_token);
      
      dispatch(setCredentials({ 
        user: user, 
        token: loginData.access_token 
      }));
      
      navigate('/');
    } catch (err) {
      const error = err as AxiosError<{ detail: string | string[] }>;
      const detail = error.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0] : detail || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AuthLayout 
      title="Create Account" 
      footer={<>Already have an account? <Link to="/login" className="auth-link">Sign In</Link></>}
    >
      <form className="register-form" onSubmit={handleSubmit}>
        {error && <div className="register-form__error">{error}</div>}
        <Input 
          label="Full Name" 
          name="full_name"
          placeholder="John Doe" 
          value={formData.full_name}
          onChange={handleChange}
          required
        />
        <Input 
          label="Email" 
          name="email"
          type="email" 
          placeholder="example@mail.com" 
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input 
          label="Password" 
          name="password"
          type="password" 
          placeholder="********" 
          value={formData.password}
          onChange={handleChange}
          required
        />
        <Button type="submit" className="register-form__submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      <div className="register-form__divider">
        <span className="register-form__divider-line" />
        <span className="register-form__divider-text">or</span>
        <span className="register-form__divider-line" />
      </div>
      <button className="register-form__guest" onClick={() => navigate('/map')}>
        Continue without account
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>
    </AuthLayout>
  );
};

export default Register;


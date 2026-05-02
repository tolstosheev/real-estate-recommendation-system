import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@shared/api/auth.service';
import AuthLayout from '@shared/ui/AuthLayout';
import Input from '@shared/ui/Input';
import Button from '@shared/ui/Button';
import './Register.scss';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authService.register(formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AuthLayout 
      title="Create Account" 
      footer={<>Already have an account? <a href="/login" className="auth-link">Sign In</a></>}
    >
      <form className="register-form" onSubmit={handleSubmit}>
        {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{error}</div>}
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
        <Button type="submit" className="register-form__submit">
          Create Account
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Register;


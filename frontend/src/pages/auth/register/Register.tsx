import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@shared/api/auth.service';
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
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-card__title">Create Account</h1>
        <form className="register-form" onSubmit={handleSubmit}>
          {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
          <div className="register-form__group">
            <label className="register-form__label">Full Name</label>
            <input 
              type="text" 
              name="full_name"
              className="register-form__input" 
              placeholder="John Doe" 
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="register-form__group">
            <label className="register-form__label">Email</label>
            <input 
              type="email" 
              name="email"
              className="register-form__input" 
              placeholder="example@mail.com" 
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="register-form__group">
            <label className="register-form__label">Password</label>
            <input 
              type="password" 
              name="password"
              className="register-form__input" 
              placeholder="********" 
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="register-form__submit">
            Create Account
          </button>
        </form>
        <div className="register-card__footer">
          Already have an account? <a href="/login" className="register-card__link">Sign In</a>
        </div>
      </div>
    </div>
  );
};

export default Register;

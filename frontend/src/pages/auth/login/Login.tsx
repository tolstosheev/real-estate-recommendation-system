import React from 'react';
import './Login.scss';

const Login: React.FC = () => {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-card__title">nestAI</h1>
        <form className="login-form">
          <div className="login-form__group">
            <label className="login-form__label">Email</label>
            <input 
              type="email" 
              className="login-form__input" 
              placeholder="example@mail.com" 
            />
          </div>
          <div className="login-form__group">
            <label className="login-form__label">Password</label>
            <input 
              type="password" 
              className="login-form__input" 
              placeholder="********" 
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

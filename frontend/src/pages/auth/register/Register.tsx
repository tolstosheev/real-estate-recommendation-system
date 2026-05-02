import React from 'react';
import './Register.scss';

const Register: React.FC = () => {
  return (
    <div className="register-page">
      <div className="register-card">
        <h1 className="register-card__title">Create Account</h1>
        <form className="register-form">
          <div className="register-form__group">
            <label className="register-form__label">Full Name</label>
            <input 
              type="text" 
              className="register-form__input" 
              placeholder="John Doe" 
            />
          </div>
          <div className="register-form__group">
            <label className="register-form__label">Email</label>
            <input 
              type="email" 
              className="register-form__input" 
              placeholder="example@mail.com" 
            />
          </div>
          <div className="register-form__group">
            <label className="register-form__label">Password</label>
            <input 
              type="password" 
              className="register-form__input" 
              placeholder="********" 
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

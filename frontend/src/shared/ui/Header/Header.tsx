import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout } from '@entities/user/model/slice';
import './Header.scss';

const Header: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo">
          nest<span>AI</span>
        </Link>

        <nav className="header__nav">
          <Link to="/" className="header__nav-link">Home</Link>
          <Link to="/catalog" className="header__nav-link">Catalog</Link>
          {isAuthenticated && <Link to="/profile" className="header__nav-link">Profile</Link>}
        </nav>

        <div className="header__actions">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="header__user-name">{user?.full_name}</Link>
              <button className="header__logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header__nav-link">Sign In</Link>
              <Link to="/register" className="header__cta-btn">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

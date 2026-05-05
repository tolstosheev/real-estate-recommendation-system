import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout } from '@entities/user/model/slice';
import './Header.scss';

const Header: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/onboarding');
    setIsMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo" onClick={closeMenu}>
          nest<span>AI</span>
        </Link>

        <button
          className={`header__burger ${isMenuOpen ? 'header__burger--active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`header__nav ${isMenuOpen ? 'header__nav--open' : ''}`}>
          <Link to="/" className="header__nav-link" onClick={closeMenu}>Home</Link>
          <Link to="/map" className="header__nav-link" onClick={closeMenu}>Map</Link>
          <Link to="/catalog" className="header__nav-link" onClick={closeMenu}>Catalog</Link>
          {isAuthenticated && <Link to="/profile" className="header__nav-link" onClick={closeMenu}>Profile</Link>}
        </nav>

        <div className={`header__actions ${isMenuOpen ? 'header__actions--open' : ''}`}>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="header__user-name" onClick={closeMenu}>{user?.full_name}</Link>
              <button className="header__logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="header__nav-link" onClick={closeMenu}>Sign In</Link>
              <Link to="/register" className="header__cta-btn" onClick={closeMenu}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

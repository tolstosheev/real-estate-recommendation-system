import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@app/store/hooks';
import { logout } from '@entities/user/model/slice';
import Login from '@pages/auth/login';
import Register from '@pages/auth/register';
import Onboarding from '@pages/onboarding';
import Home from '@pages/home';
import MapPage from '@pages/map';
import Catalog from '@pages/catalog';
import PropertyDetails from '@pages/property-details';
import Profile from '@pages/profile';
import { AddPropertyPage } from '@pages/add-property';
import Header from '@shared/ui/Header';

const Layout: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="app-layout">
      <Header isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

const GuestRoute: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

const OnboardingRoute: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route element={<OnboardingRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
        </Route>
        <Route element={<GuestRoute />}>
          <Route element={<Layout />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/add-property" element={<AddPropertyPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

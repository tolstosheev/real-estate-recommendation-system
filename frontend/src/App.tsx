import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Login from '@pages/auth/login';
import Register from '@pages/auth/register';
import Onboarding from '@pages/onboarding';
import Home from '@pages/home';
import Catalog from '@pages/catalog';
import PropertyDetails from '@pages/property-details';
import Header from '@shared/ui/Header';

const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

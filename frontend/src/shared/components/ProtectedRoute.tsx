import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

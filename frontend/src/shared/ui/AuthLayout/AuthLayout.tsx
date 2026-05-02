import React from 'react';
import Card from '@shared/ui/Card';
import './AuthLayout.scss';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children, footer }) => {
  return (
    <div className="auth-layout">
      <Card>
        <div className="auth-card-inner">
          <h1 className="auth-title">{title}</h1>
          {children}
          <div className="auth-footer">
            {footer}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuthLayout;

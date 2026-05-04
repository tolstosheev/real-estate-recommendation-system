import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import Button from '@shared/ui/Button';
import './Onboarding.scss';

const steps = [
  { 
    title: 'Welcome to nestAI', 
    subtitle: 'The future of real estate search is here.',
    description: 'Forget about endless scrolling through irrelevant listings. nestAI understands what you actually want.',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="#FFFFFF" opacity="0.08" />
        <path d="M100 40L55 75V155H85V110H115V155H145V75L100 40Z" fill="#FFFFFF" opacity="0.9" />
        <circle cx="100" cy="85" r="12" fill="#F59E0B" />
      </svg>
    ),
  },
  { 
    title: 'AI-Powered Discovery', 
    subtitle: 'Beyond simple filters',
    description: 'Our system analyzes your behavior and explicit preferences to predict your perfect home.',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="#FFFFFF" opacity="0.08" />
        <path d="M70 110L85 95L100 105L130 70" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <circle cx="70" cy="110" r="8" fill="#F59E0B" />
        <circle cx="85" cy="95" r="8" fill="#FFFFFF" />
        <circle cx="100" cy="105" r="8" fill="#FFFFFF" />
        <circle cx="130" cy="70" r="8" fill="#FFFFFF" />
        <path d="M120 60L130 70L140 60" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  { 
    title: 'Spatial Intelligence', 
    subtitle: 'Precision that matters',
    description: 'Using advanced geographic data, we find properties in the exact atmosphere and location you desire.',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="#FFFFFF" opacity="0.08" />
        <circle cx="100" cy="80" r="30" stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.9" />
        <circle cx="100" cy="80" r="10" fill="#F59E0B" />
        <path d="M100 110V150" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
        <path d="M85 125L100 110L115 125" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <circle cx="100" cy="45" r="4" fill="#FFFFFF" />
        <circle cx="145" cy="80" r="4" fill="#FFFFFF" />
        <circle cx="55" cy="80" r="4" fill="#FFFFFF" />
      </svg>
    ),
  },
  { 
    title: 'Personalized Feed', 
    subtitle: 'Evolves with you',
    description: 'The more you interact, the smarter nestAI becomes, constantly refining your recommendations.',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="#FFFFFF" opacity="0.08" />
        <rect x="50" y="50" width="45" height="50" rx="6" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.9" />
        <rect x="75" y="75" width="45" height="50" rx="6" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.9" />
        <rect x="100" y="100" width="45" height="50" rx="6" fill="#F59E0B" />
        <circle cx="72.5" cy="65" r="4" fill="#F59E0B" />
        <circle cx="97.5" cy="90" r="4" fill="#F59E0B" />
        <circle cx="122.5" cy="115" r="4" fill="#FFFFFF" />
      </svg>
    ),
  },
  { 
    title: 'Ready to start?', 
    subtitle: 'Find your dream home today',
    description: 'Create an account to let our AI start working for you.',
    icon: (
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="80" fill="#FFFFFF" opacity="0.08" />
        <path d="M100 60C78 60 60 78 60 100C60 122 78 140 100 140C122 140 140 122 140 100" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
        <path d="M100 75V100L115 115" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="100" cy="100" r="4" fill="#FFFFFF" />
      </svg>
    ),
  },
];

const Onboarding: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const handleNext = () => {
    if (step < steps.length - 1) {
      setDirection('next');
      setStep(step + 1);
    } else {
      navigate('/register');
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setDirection('prev');
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-visual">
          <div className="onboarding-visual__bg">
            <div className="onboarding-visual__circle onboarding-visual__circle--1" />
            <div className="onboarding-visual__circle onboarding-visual__circle--2" />
            <div className="onboarding-visual__circle onboarding-visual__circle--3" />
          </div>
          <div className={`onboarding-icon ${direction === 'next' ? 'animate-in-right' : 'animate-in-left'}`}>
            {steps[step].icon}
          </div>
        </div>

        <div className="onboarding-card">
          <div className="onboarding-progress">
            <div className="onboarding-progress__bar">
              <div className="onboarding-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="onboarding-progress__label">{step + 1} / {steps.length}</span>
          </div>

          <div className={`onboarding-header ${direction === 'next' ? 'animate-in-right' : 'animate-in-left'}`}>
            <h1 className="onboarding-header__title">{steps[step].title}</h1>
            <p className="onboarding-header__subtitle">{steps[step].subtitle}</p>
          </div>

          <div className="onboarding-content">
            <p className={`onboarding-info-text ${direction === 'next' ? 'animate-in-right' : 'animate-in-left'}`}>
              {steps[step].description}
            </p>
          </div>

          <div className="onboarding-footer">
            <Button 
              variant="secondary" 
              onClick={handleSkip}
            >
              Skip
            </Button>
            <div className="onboarding-footer__actions">
              <Button 
                variant="secondary" 
                onClick={handlePrev} 
                disabled={step === 0}
                className="onboarding-footer__btn-back"
              >
                Back
              </Button>
              <Button 
                variant="primary" 
                onClick={handleNext}
              >
                {step === steps.length - 1 ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

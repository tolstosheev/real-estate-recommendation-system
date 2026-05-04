import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@app/store/hooks';
import Button from '@shared/ui/Button';
import './Onboarding.scss';


const Onboarding: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const steps = [
    { 
      title: 'Welcome to nestAI', 
      subtitle: 'The future of real estate search is here.',
      description: 'Forget about endless scrolling through irrelevant listings. nestAI understands what you actually want.'
    },
    { 
      title: 'AI-Powered Discovery', 
      subtitle: 'Beyond simple filters',
      description: 'Our system analyzes your behavior and explicit preferences to predict your perfect home.'
    },
    { 
      title: 'Spatial Intelligence', 
      subtitle: 'Precision that matters',
      description: 'Using advanced geographic data, we find properties in the exact atmosphere and location you desire.'
    },
    { 
      title: 'Personalized Feed', 
      subtitle: 'Evolves with you',
      description: 'The more you interact, the smarter nestAI becomes, constantly refining your recommendations.'
    },
    { 
      title: 'Ready to start?', 
      subtitle: 'Find your dream home today',
      description: 'Create an account to let our AI start working for you.'
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      navigate('/register');
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    navigate('/login');
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <h1 className="onboarding-header__title">{steps[step].title}</h1>
          <p className="onboarding-header__subtitle">{steps[step].subtitle}</p>
        </div>

        <div className="onboarding-steps">
          {steps.map((_, index) => (
            <div key={index} className="onboarding-step">
              <div className={`onboarding-step__indicator ${index <= step ? 'onboarding-step__indicator--active' : ''}`}>
                {index + 1}
              </div>
              <span className={`onboarding-step__label ${index === step ? 'onboarding-step__label--active' : ''}`}>
                Step {index + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-info-text">
            {steps[step].description}
          </div>
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
              {step === steps.length - 1 ? 'Register' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

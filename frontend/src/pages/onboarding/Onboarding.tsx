import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@app/store/hooks';
import './Onboarding.scss';

import 'swiper/css';
import 'swiper/css/navigation';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState({
    min_price: '',
    max_price: '',
    min_area: '',
    preferred_rooms: [] as number[],
    tags: [] as string[],
  });

  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const steps = [
    { title: 'Budget', subtitle: 'Tell us about your price range' },
    { title: 'Space', subtitle: 'How much area do you need?' },
    { title: 'Rooms', subtitle: 'Choose the number of rooms' },
    { title: 'Vibe', subtitle: 'What atmosphere are you looking for?' },
    { title: 'Ready!', subtitle: 'Let AI find your perfect home' },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      console.log('Submit preferences:', preferences);
      navigate('/');
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
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
          <Swiper
            modules={[Navigation]}
            onSlideChange={(swiper) => setStep(swiper.activeIndex)}
            allowTouchMove={false}
            className="onboarding-slider"
          >
            <SwiperSlide>
              <div className="onboarding-form">
                <div className="onboarding-form__group">
                  <label className="onboarding-form__label">Min Price</label>
                  <input 
                    type="number" 
                    className="onboarding-form__input" 
                    value={preferences.min_price}
                    onChange={(e) => setPreferences({ ...preferences, min_price: e.target.value })}
                  />
                </div>
                <div className="onboarding-form__group">
                  <label className="onboarding-form__label">Max Price</label>
                  <input 
                    type="number" 
                    className="onboarding-form__input" 
                    value={preferences.max_price}
                    onChange={(e) => setPreferences({ ...preferences, max_price: e.target.value })}
                  />
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="onboarding-form">
                <div className="onboarding-form__group">
                  <label className="onboarding-form__label">Min Area (sqm)</label>
                  <input 
                    type="number" 
                    className="onboarding-form__input" 
                    value={preferences.min_area}
                    onChange={(e) => setPreferences({ ...preferences, min_area: e.target.value })}
                  />
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="onboarding-form">
                <div className="onboarding-form__chips">
                  {[1, 2, 3, 4, 5].map(num => (
                    <div 
                      key={num} 
                      className={`onboarding-chip ${preferences.preferred_rooms.includes(num) ? 'onboarding-chip--active' : ''}`}
                      onClick={() => {
                        const rooms = preferences.preferred_rooms.includes(num) 
                          ? preferences.preferred_rooms.filter(r => r !== num)
                          : [...preferences.preferred_rooms, num];
                        setPreferences({ ...preferences, preferred_rooms: rooms });
                      }}
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="onboarding-form">
                <div className="onboarding-form__chips">
                  {['Modern', 'Cozy', 'Center', 'Quiet', 'Luxury'].map(tag => (
                    <div 
                      key={tag} 
                      className={`onboarding-chip ${preferences.tags.includes(tag) ? 'onboarding-chip--active' : ''}`}
                      onClick={() => {
                        const tags = preferences.tags.includes(tag) 
                          ? preferences.tags.filter(t => t !== tag)
                          : [...preferences.tags, tag];
                        setPreferences({ ...preferences, tags: tags });
                      }}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            </SwiperSlide>

            <SwiperSlide>
              <div className="onboarding-summary">
                <p>We are ready to find your home!</p>
                <div className="onboarding-summary__details">
                  Price: {preferences.min_price} - {preferences.max_price} <br/>
                  Area: from {preferences.min_area} <br/>
                  Rooms: {preferences.preferred_rooms.join(', ')} <br/>
                  Tags: {preferences.tags.join(', ')}
                </div>
              </div>
            </SwiperSlide>
          </Swiper>
        </div>

        <div className="onboarding-footer">
          <button 
            className="btn-secondary" 
            onClick={handlePrev} 
            disabled={step === 0}
          >
            Back
          </button>
          <button 
            className="btn-primary" 
            onClick={handleNext}
          >
            {step === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

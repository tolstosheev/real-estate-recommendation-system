import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { useAppSelector } from '@app/store/hooks';
import { recommendationsService } from '@shared/api/recommendations.service';
import PropertyCard from '@entities/property/ui';
import type { PropertyRecommendation } from '@shared/api/types';
import './Home.scss';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const Home: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [recs, setRecs] = useState<PropertyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchRecs = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const data = await recommendationsService.getRecommendations({ signal: controller.signal });
      if (!controller.signal.aborted) {
        setRecs(data);
        setHasError(false);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      console.error('Failed to fetch recommendations', e);
      setHasError(true);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecs();
    } else {
      setHasError(true);
    }
    return () => abortRef.current?.abort();
  }, [isAuthenticated, fetchRecs]);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <h1 className="hero__title">Find Your Dream Home <br/> with nestAI</h1>
          <p className="hero__subtitle">
            Our intelligent system analyzes your behavior to suggest 
            properties that match your soul, not just your filters.
          </p>
        </div>
      </section>

      <section className="recommendations-section">
        <div className="recommendations-section__header">
          <h2 className="recommendations-section__title">AI-Powered Recommendations</h2>
        </div>

        {isLoading ? (
          <div className="recommendations-loading">Loading recommendations...</div>
        ) : hasError ? (
          <div className="recommendations-empty">
            <p>Sign in to get personalized recommendations</p>
          </div>
        ) : recs.length === 0 ? (
          <div className="recommendations-empty">
            <p>No recommendations yet. Interact with properties to train the AI!</p>
          </div>
        ) : (
          <div className="recommendations-slider-wrapper">
            <div className="recommendations-nav recommendations-nav--prev">
              <div className="swiper-button-prev"></div>
            </div>
            <div className="recommendations-nav recommendations-nav--next">
              <div className="swiper-button-next"></div>
            </div>
            <Swiper
              modules={[Pagination, Navigation]}
              spaceBetween={24}
              slidesPerView={1}
              navigation={{
                prevEl: '.recommendations-nav--prev .swiper-button-prev',
                nextEl: '.recommendations-nav--next .swiper-button-next',
              }}
              pagination={{
                clickable: true,
                el: '.recommendations-pagination-container',
              }}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
                1440: { slidesPerView: 4 },
              }}
              className="recommendations-slider"
            >
              {recs.map((prop) => (
                <SwiperSlide key={prop.id}>
                  <div className="recommendations-slide">
                    <PropertyCard property={prop} variant="vertical" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="recommendations-pagination-container"></div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { recommendationsService } from '@shared/api/recommendations.service';
import PropertyCard from '@entities/property/ui';
import type { PropertyRecommendation } from '@entities/property/model/types';
import './Home.scss';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const Home: React.FC = () => {
  const [recs, setRecs] = useState<PropertyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const data = await recommendationsService.getRecommendations();
        setRecs(data);
        setHasError(false);
      } catch (e) {
        console.error('Failed to fetch recommendations', e);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecs();
  }, []);

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
          <Swiper
            modules={[Pagination, Navigation]}
            spaceBetween={24}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
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
        )}
      </section>
    </div>
  );
};

export default Home;

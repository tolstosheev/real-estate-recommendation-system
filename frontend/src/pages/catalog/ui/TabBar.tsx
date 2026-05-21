import React from 'react';

export type TabType = 'all' | 'viewed' | 'liked';

interface TabBarProps {
  activeTab: TabType;
  isAuthenticated: boolean;
  onTabChange: (tab: TabType) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, isAuthenticated, onTabChange }) => (
  <div className="catalog-tabs">
    <button
      className={`catalog-tab ${activeTab === 'all' ? 'catalog-tab--active' : ''}`}
      onClick={() => onTabChange('all')}
    >
      All
    </button>
    {isAuthenticated && (
      <button
        className={`catalog-tab ${activeTab === 'viewed' ? 'catalog-tab--active' : ''}`}
        onClick={() => onTabChange('viewed')}
      >
        Viewed
      </button>
    )}
    {isAuthenticated && (
      <button
        className={`catalog-tab ${activeTab === 'liked' ? 'catalog-tab--active' : ''}`}
        onClick={() => onTabChange('liked')}
      >
        Liked
      </button>
    )}
  </div>
);

export default TabBar;

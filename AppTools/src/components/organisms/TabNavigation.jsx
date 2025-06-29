// src/components/organisms/TabNavigation.jsx
import React from 'react';
import TabButton from '../atoms/TabButton';

/**
 * Composant de navigation par onglets
 */
const TabNavigation = ({ tabs = [], activeTab, onTabChange, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav className="flex -mb-px">
        {tabs.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>
            {tab.label}
          </TabButton>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;

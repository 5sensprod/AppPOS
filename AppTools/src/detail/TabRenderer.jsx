// src/components/detail/TabRenderer.jsx
import React from 'react';
import SectionRenderer from './SectionRenderer';

const TabRenderer = ({ tabConfig, editable }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {tabConfig.sections.map((section, idx) => (
        <SectionRenderer key={idx} section={section} editable={editable} />
      ))}
    </div>
  );
};

export default TabRenderer;

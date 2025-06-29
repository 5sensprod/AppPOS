// src/components/detail/TabRenderer.jsx
import React from 'react';
import SectionRenderer from './SectionRenderer';

const TabRenderer = ({ tabConfig, editable, entity }) => {
  console.log('🐛 [TAB_RENDERER] appelé avec:', { tabConfig, editable, entity });

  if (!tabConfig) {
    console.log('❌ [TAB_RENDERER] tabConfig est null/undefined');
    return <div>Pas de config pour ce tab</div>;
  }

  if (!tabConfig.sections) {
    console.log('❌ [TAB_RENDERER] tabConfig.sections manquant');
    return <div>Pas de sections dans ce tab</div>;
  }

  console.log('✅ [TAB_RENDERER] Rendu de', tabConfig.sections.length, 'sections');

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {tabConfig.sections.map((section, idx) => (
        <SectionRenderer key={idx} section={section} editable={editable} entity={entity} />
      ))}
    </div>
  );
};

export default TabRenderer;

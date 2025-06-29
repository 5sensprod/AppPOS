// src/components/detail/SectionRenderer.jsx
import React from 'react';
import FieldRenderer from './FieldRenderer';

const SectionRenderer = ({ section, editable, entity }) => {
  console.log('🐛 [SECTION_RENDERER] appelé avec:', { section, editable, entity });

  if (!section.fields) {
    console.log('❌ [SECTION_RENDERER] section.fields manquant');
    return <div>Pas de champs dans cette section</div>;
  }

  console.log('✅ [SECTION_RENDERER] Rendu de', section.fields.length, 'champs');
  return (
    <div className="mb-6">
      {section.title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {section.title}
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => (
          <FieldRenderer key={field.name} fieldConfig={field} editable={editable} entity={entity} />
        ))}
      </div>
    </div>
  );
};

export default SectionRenderer;

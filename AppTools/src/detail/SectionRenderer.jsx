// src/components/detail/SectionRenderer.jsx
import React from 'react';
import FieldRenderer from './FieldRenderer';

const SectionRenderer = ({ section, editable }) => {
  return (
    <div className="mb-6">
      {section.title && (
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {section.title}
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section.fields.map((field) => (
          <FieldRenderer key={field.name} fieldConfig={field} editable={editable} />
        ))}
      </div>
    </div>
  );
};

export default SectionRenderer;

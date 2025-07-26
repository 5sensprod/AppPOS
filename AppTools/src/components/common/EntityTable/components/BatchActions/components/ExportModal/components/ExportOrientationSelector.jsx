// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\ExportOrientationSelector.jsx
import React from 'react';
import { FileText, Grid } from 'lucide-react';

const ExportOrientationSelector = ({ orientation, onOrientationChange, exportType }) => {
  const getOrientationIcon = (orient) => {
    return orient === 'portrait' ? <FileText className="h-4 w-4" /> : <Grid className="h-4 w-4" />;
  };

  const orientations = [
    {
      value: 'portrait',
      label: 'Portrait',
      description:
        exportType === 'labels' ? 'Étiquettes verticales' : 'Vertical (hauteur > largeur)',
    },
    {
      value: 'landscape',
      label: 'Paysage',
      description:
        exportType === 'labels' ? 'Étiquettes horizontales' : 'Horizontal (largeur > hauteur)',
    },
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Orientation PDF
      </label>
      <div className="space-y-2">
        {orientations.map((orient) => (
          <label key={orient.value} className="flex items-center">
            <input
              type="radio"
              name="orientation"
              value={orient.value}
              checked={orientation === orient.value}
              onChange={(e) => onOrientationChange(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              {getOrientationIcon(orient.value)}
              <span className="ml-2">
                <span className="font-medium">{orient.label}</span>
                <span className="text-gray-500 ml-1">- {orient.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ExportOrientationSelector;

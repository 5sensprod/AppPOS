//LabelPreview.jsx
import React from 'react';
import { Eye, Ruler } from 'lucide-react';
import FabricLabelCanvas from './FabricLabelCanvas';

const LabelPreview = ({ labelData, customLayout, labelStyle }) => {
  if (!labelData || labelData.length === 0) return null;

  const sampleLabel = labelData[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Aperçu étiquette - Taille réelle
        </h4>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Ruler className="h-3 w-3 mr-1" />
          {customLayout.width} × {customLayout.height} mm
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <FabricLabelCanvas label={sampleLabel} layout={customLayout} style={labelStyle} />
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;

// src/features/labels/components/templates/ImageTemplates.jsx
import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

const ImageTemplates = () => {
  const presets = [
    { id: 'logo', label: 'Logo', size: '200x200' },
    { id: 'product', label: 'Produit', size: '300x300' },
    { id: 'banner', label: 'Bannière', size: '800x200' },
    { id: 'icon', label: 'Icône', size: '64x64' },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Upload */}
      <button className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-gray-400" />
          <span className="text-sm font-medium">Importer une image</span>
          <span className="text-xs text-gray-500">PNG, JPG jusqu'à 10MB</span>
        </div>
      </button>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Formats prédéfinis
        </h3>
        <div className="space-y-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.size}px</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageTemplates;

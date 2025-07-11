// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\ExportFormatSelector.jsx
import React from 'react';
import { FileText, FileSpreadsheet, FileOutput } from 'lucide-react';

const ExportFormatSelector = ({ exportFormat, onFormatChange, exportType }) => {
  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <FileOutput className="h-4 w-4" />;
    }
  };

  const formats = [
    {
      value: 'pdf',
      label: 'PDF',
      description:
        exportType === 'labels'
          ? 'Étiquettes prêtes à imprimer'
          : 'Document portable avec mise en page',
    },
    {
      value: 'csv',
      label: 'CSV',
      description: 'Fichier de données pour tableur',
      disabled: exportType === 'labels', // CSV non disponible pour étiquettes
    },
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Format d'export
      </label>
      <div className="space-y-2">
        {formats.map((format) => (
          <label
            key={format.value}
            className={`flex items-center ${format.disabled ? 'opacity-50' : ''}`}
          >
            <input
              type="radio"
              name="exportFormat"
              value={format.value}
              checked={exportFormat === format.value}
              onChange={(e) => onFormatChange(e.target.value)}
              disabled={format.disabled}
              className="mr-3 text-blue-600"
            />
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              {getFormatIcon(format.value)}
              <span className="ml-2">
                <span className="font-medium">{format.label}</span>
                <span className="text-gray-500 ml-1">- {format.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ExportFormatSelector;

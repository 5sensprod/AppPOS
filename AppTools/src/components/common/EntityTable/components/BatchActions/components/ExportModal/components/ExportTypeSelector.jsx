// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\ExportTypeSelector.jsx
import React from 'react';
import { Table, Tag } from 'lucide-react';

const ExportTypeSelector = ({ exportType, onExportTypeChange }) => {
  const getExportTypeIcon = (type) => {
    return type === 'table' ? <Table className="h-4 w-4" /> : <Tag className="h-4 w-4" />;
  };

  const exportTypes = [
    {
      value: 'table',
      label: 'Tableau',
      description: 'Export traditionnel en tableau avec colonnes sélectionnables',
    },
    {
      value: 'labels',
      label: 'Étiquettes',
      description: "Export d'étiquettes avec prix et code-barres",
    },
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Type d'export
      </label>
      <div className="space-y-2">
        {exportTypes.map((type) => (
          <label key={type.value} className="flex items-center">
            <input
              type="radio"
              name="exportType"
              value={type.value}
              checked={exportType === type.value}
              onChange={(e) => onExportTypeChange(e.target.value)}
              className="mr-3 text-blue-600"
            />
            <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              {getExportTypeIcon(type.value)}
              <span className="ml-2">
                <span className="font-medium">{type.label}</span>
                <span className="text-gray-500 ml-1">- {type.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ExportTypeSelector;

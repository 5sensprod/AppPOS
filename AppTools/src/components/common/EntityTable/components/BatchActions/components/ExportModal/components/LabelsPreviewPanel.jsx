// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\LabelsPreviewPanel.jsx
import React from 'react';

const LabelsPreviewPanel = ({ labelData = [], selectedCount = 0 }) => {
  return (
    <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-md p-4">
      <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
        Aperçu des étiquettes ({selectedCount})
      </h4>
      <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1 max-h-32 overflow-y-auto">
        {labelData.slice(0, 3).map((item, index) => (
          <div key={item.id} className="border-b border-amber-200 dark:border-amber-700 pb-1 mb-1">
            <p>
              <strong>{item.name}</strong>
            </p>
            <p>
              Prix: {item.price}€ | Code: {item.barcode || 'Aucun'}
            </p>
          </div>
        ))}
        {selectedCount > 3 && <p className="italic">... et {selectedCount - 3} autres produits</p>}
      </div>
    </div>
  );
};

export default LabelsPreviewPanel;

//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportTable\hooks\useTableExport.jsx
import { useState, useCallback, useEffect } from 'react';
import { ENTITY_CONFIG } from '../../../../../../../../features/products/constants';

export const useTableExport = ({
  isOpen,
  activeFilters = [],
  entityNamePlural = '',
  selectedItems = [],
}) => {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [orientation, setOrientation] = useState('landscape');
  const [exportTitle, setExportTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [includeId, setIncludeId] = useState(false);
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');

  const generateExportTitle = useCallback(() => {
    let title = `Inventaire ${entityNamePlural}`;
    if (activeFilters.length) {
      const byType = activeFilters.reduce((acc, f) => {
        const [, val] = f.label.split(': ');
        acc[f.type] = acc[f.type] || [];
        acc[f.type].push(val || f.label);
        return acc;
      }, {});
      const parts = Object.values(byType).map((vals) => vals.join(', '));
      if (parts.length) title += ` - ${parts.join(' - ')}`;
    }

    setExportTitle(title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_'));
  }, [activeFilters, entityNamePlural]);

  const resetForm = useCallback(() => {
    const defaults = ENTITY_CONFIG.columns
      .filter((c) => c.key !== 'image' && c.key !== 'actions')
      .map((c) => c.key);

    setSelectedColumns(defaults);
    setIncludeId(false);
    setUseCustomColumn(false);
    setCustomColumnTitle('Décompte');
    setExportFormat('pdf');
    setOrientation('landscape');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [isOpen, generateExportTitle]);

  return {
    exportFormat,
    setExportFormat,
    orientation,
    setOrientation,
    exportTitle,
    setExportTitle,
    loading,
    setLoading,
    selectedColumns,
    setSelectedColumns,
    includeId,
    setIncludeId,
    useCustomColumn,
    setUseCustomColumn,
    customColumnTitle,
    setCustomColumnTitle,
    resetForm,
    generateExportTitle,
  };
};

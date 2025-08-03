// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\hooks\useExportModal.js
import { useState, useCallback, useEffect } from 'react';
import { ENTITY_CONFIG } from '../../../../../../../../features/products/constants';

export const useExportModal = ({
  isOpen,
  activeFilters = [],
  entityNamePlural = '',
  selectedItems = [],
  productsData = [],
}) => {
  const [exportType, setExportType] = useState('table');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [orientation, setOrientation] = useState('landscape'); // ✅ PAYSAGE PAR DÉFAUT
  const [exportTitle, setExportTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [includeId, setIncludeId] = useState(false);
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');

  const [labelLayout, setLabelLayout] = useState({
    preset: 'custom',
    layout: {
      width: 48.5,
      height: 25,
      columns: 4,
      rows: 11,
      offsetTop: 22,
      offsetBottom: 22,
      offsetLeft: 8,
      offsetRight: 8,
      spacingH: 0,
      spacingV: 0,
      perPage: 44,
    },
    style: {
      fontSize: 12,
      fontFamily: 'Arial',
      showBorder: false,
      borderWidth: 1,
      borderColor: '#000000',
      padding: 2,
      alignment: 'center',
      showBarcode: true,
      barcodeHeight: 15,
      showPrice: true,
      priceSize: 14,
      showName: false,
      nameSize: 10,
    },
  });

  const extractLabelData = useCallback(() => {
    const selectedProducts = selectedItems
      .map((id) => productsData.find((product) => product._id === id))
      .filter(Boolean);

    const labelData = selectedProducts.map((product) => {
      const barcodeMetaData = product.meta_data?.find((meta) => meta.key === 'barcode');
      const barcode = barcodeMetaData?.value || '';

      return {
        id: product._id,
        name: product.name || product.designation || product.sku,
        price: product.price || 0,
        barcode: barcode,
        sku: product.sku || '',
        designation: product.designation || '',
      };
    });

    return labelData;
  }, [selectedItems, productsData]);

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

    if (exportType === 'labels') {
      title = title.replace('Inventaire', 'Étiquettes');
    }

    setExportTitle(title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_'));
  }, [activeFilters, entityNamePlural, exportType]);

  const resetForm = useCallback(() => {
    const defaults = ENTITY_CONFIG.columns
      .filter((c) => c.key !== 'image' && c.key !== 'actions')
      .map((c) => c.key);

    setSelectedColumns(defaults);
    setIncludeId(false);
    setUseCustomColumn(false);
    setCustomColumnTitle('Décompte');
    setExportFormat('pdf');
    setOrientation('landscape'); // ✅ RESET EN PAYSAGE
    setExportType('table');
    setLoading(false);

    setLabelLayout({
      preset: 'custom',
      layout: {
        width: 48.5,
        height: 25,
        columns: 4,
        rows: 11,
        offsetTop: 22,
        offsetBottom: 22,
        offsetLeft: 8,
        offsetRight: 8,
        spacingH: 0,
        spacingV: 0,
        perPage: 44,
      },
      style: {
        fontSize: 12,
        fontFamily: 'Arial',
        showBorder: false,
        borderWidth: 1,
        borderColor: '#000000',
        padding: 2,
        alignment: 'center',
        showBarcode: true,
        barcodeHeight: 15,
        showPrice: true,
        priceSize: 14,
        showName: false,
        nameSize: 10,
      },
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [exportType, isOpen, generateExportTitle]);

  return {
    exportType,
    setExportType,
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
    labelLayout,
    setLabelLayout,
    extractLabelData,
    resetForm,
    generateExportTitle,
  };
};

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
  // ✅ ÉTATS PRINCIPAUX
  const [exportType, setExportType] = useState('table'); // 'table' ou 'labels'
  const [exportFormat, setExportFormat] = useState('pdf');
  const [orientation, setOrientation] = useState('portrait');
  const [exportTitle, setExportTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ ÉTATS POUR LES TABLEAUX
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [includeId, setIncludeId] = useState(false);
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');

  // ✅ ÉTATS POUR LES ÉTIQUETTES (custom par défaut)
  const [labelLayout, setLabelLayout] = useState({
    preset: 'custom', // ✅ Custom par défaut
    layout: {
      width: 48.5, // ✅ Valeurs par défaut de votre image
      height: 25,
      columns: 4,
      rows: 11,
      offsetTop: 22, // ✅ Renommé margins -> offsets
      offsetBottom: 22,
      offsetLeft: 8,
      offsetRight: 8,
      spacingH: 0, // ✅ Espacement Horizontal
      spacingV: 0, // ✅ Espacement Vertical
      perPage: 44, // 4 * 11
    },
    style: {
      fontSize: 12,
      fontFamily: 'Arial',
      showBorder: true,
      borderWidth: 1,
      borderColor: '#000000',
      padding: 2,
      alignment: 'center',
      showBarcode: true,
      barcodeHeight: 15,
      showPrice: true,
      priceSize: 14,
      showName: true,
      nameSize: 10,
    },
  });

  // ✅ FONCTION POUR EXTRAIRE LES DONNÉES D'ÉTIQUETTES
  const extractLabelData = useCallback(() => {
    const selectedProducts = selectedItems
      .map((id) => productsData.find((product) => product._id === id))
      .filter(Boolean);

    const labelData = selectedProducts.map((product) => {
      // Extraire le code-barres depuis meta_data
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

  // ✅ GÉNÉRATION AUTOMATIQUE DU TITRE
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

    // Adapter le titre selon le type d'export
    if (exportType === 'labels') {
      title = title.replace('Inventaire', 'Étiquettes');
    }

    setExportTitle(title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_'));
  }, [activeFilters, entityNamePlural, exportType]);

  // ✅ FONCTION DE RÉINITIALISATION
  const resetForm = useCallback(() => {
    const defaults = ENTITY_CONFIG.columns
      .filter((c) => c.key !== 'image' && c.key !== 'actions')
      .map((c) => c.key);

    setSelectedColumns(defaults);
    setIncludeId(false);
    setUseCustomColumn(false);
    setCustomColumnTitle('Décompte');
    setExportFormat('pdf');
    setOrientation('portrait');
    setExportType('table');
    setLoading(false);

    // ✅ RÉINITIALISER le layout des étiquettes (custom par défaut)
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
        showBorder: true,
        borderWidth: 1,
        borderColor: '#000000',
        padding: 2,
        alignment: 'center',
        showBarcode: true,
        barcodeHeight: 15,
        showPrice: true,
        priceSize: 14,
        showName: true,
        nameSize: 10,
      },
    });
  }, []);

  // ✅ LOGGING AUTOMATIQUE POUR LES ÉTIQUETTES (développement)
  useEffect(() => {
    if (exportType === 'labels' && selectedItems.length > 0 && productsData.length > 0) {
      const labelData = extractLabelData();
      console.log('🏷️ Données étiquettes extraites:', labelData);

      // Afficher le prix et code-barres spécifiquement
      console.log('💰 Prix et codes-barres:');
      labelData.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`);
        console.log(`   Prix: ${item.price}€`);
        console.log(`   Code-barres: "${item.barcode}"`);
        console.log(`   SKU: ${item.sku}`);
        console.log('---');
      });
    }
  }, [exportType, selectedItems, productsData, extractLabelData]);

  // ✅ MISE À JOUR DU TITRE QUAND LE TYPE CHANGE
  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [exportType, isOpen, generateExportTitle]);

  return {
    // États principaux
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

    // États pour les tableaux
    selectedColumns,
    setSelectedColumns,
    includeId,
    setIncludeId,
    useCustomColumn,
    setUseCustomColumn,
    customColumnTitle,
    setCustomColumnTitle,

    // États pour les étiquettes
    labelLayout,
    setLabelLayout,

    // Fonctions utilitaires
    extractLabelData,
    resetForm,
    generateExportTitle,
  };
};

//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\hooks\useLabelExport.jsx
import { useState, useEffect, useCallback } from 'react';
import userPresetService from '../../../../../../../../services/userPresetService';

const LABEL_STYLE_CATEGORY = 'label_style';
const PRINT_LAYOUT_CATEGORY = 'print_layout';

const DEFAULT_STYLE = {
  fontSize: 12,
  fontFamily: 'Arial',
  showBorder: false,
  borderWidth: 0.1,
  borderColor: '#000000',
  padding: 3,
  alignment: 'center',
  showBarcode: true,
  barcodeHeight: 15,
  showPrice: true,
  priceSize: 14,
  showName: false,
  nameSize: 10,
  duplicateCount: 1,
};

const DEFAULT_LAYOUT = {
  width: 48.5,
  height: 25,
  offsetTop: 22,
  offsetLeft: 8,
  spacingV: 0,
  spacingH: 0,
  supportType: 'A4',
  rouleau: { width: 58 },
};

export const useLabelExport = ({
  isOpen,
  activeFilters = [],
  entityNamePlural = '',
  selectedItems = [],
  productsData = [],
}) => {
  const [exportTitle, setExportTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [labelStyle, setLabelStyle] = useState(DEFAULT_STYLE);
  const [savedStylePresets, setSavedStylePresets] = useState([]);
  const [enableCellSelection, setEnableCellSelection] = useState(false);
  const [disabledCells, setDisabledCells] = useState(new Set());
  const [currentLayout, setCurrentLayout] = useState(DEFAULT_LAYOUT);
  const [savedLayoutPresets, setSavedLayoutPresets] = useState([]);
  const [supportTypes] = useState([
    {
      id: 'A4',
      name: 'A4 (210×297mm)',
      description: 'Feuille A4 standard',
      defaults: { width: 48.5, height: 25, offsetTop: 22, offsetLeft: 8, spacingV: 0, spacingH: 0 },
    },
    {
      id: 'rouleau',
      name: "Rouleau d'étiquettes",
      description: 'Support rouleau (coupe automatique)',
      defaults: { width: 50, height: 29, offsetTop: 2, offsetLeft: 5, spacingV: 0, spacingH: 0 },
    },
    {
      id: 'custom',
      name: 'Format personnalisé',
      description: 'Dimensions sur mesure',
      defaults: { width: 50, height: 25, offsetTop: 10, offsetLeft: 10, spacingV: 0, spacingH: 0 },
    },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stylePresets = await userPresetService.refreshPresets(LABEL_STYLE_CATEGORY);
        setSavedStylePresets(stylePresets);

        const layoutPresets = await userPresetService.refreshPresets(PRINT_LAYOUT_CATEGORY);
        setSavedLayoutPresets(layoutPresets);
      } catch (error) {
        console.warn('Erreur chargement presets:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const generateExportTitle = useCallback(() => {
    let title = `Étiquettes ${entityNamePlural}`;
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

  const extractLabelData = useCallback(() => {
    const selectedProducts = selectedItems
      .map((id) => productsData.find((product) => product._id === id))
      .filter(Boolean);

    return selectedProducts.map((product) => {
      const barcodeMetaData = product.meta_data?.find((meta) => meta.key === 'barcode');
      return {
        id: product._id,
        name: product.name || product.designation || product.sku,
        price: product.price || 0,
        barcode: barcodeMetaData?.value || '',
        sku: product.sku || '',
        designation: product.designation || '',
      };
    });
  }, [selectedItems, productsData]);

  const buildLabelLayout = useCallback(() => {
    return {
      layout: currentLayout,
      style: labelStyle,
      disabledCells: Array.from(disabledCells),
    };
  }, [currentLayout, labelStyle, disabledCells]);

  const handleStyleChange = useCallback(
    (newStyle) => {
      const updatedStyle = { ...labelStyle, ...newStyle };
      setLabelStyle(updatedStyle);
    },
    [labelStyle]
  );

  const handleLayoutChange = useCallback(
    (field, value) => {
      let updatedLayout = { ...currentLayout };

      if (field === 'rouleau') {
        updatedLayout.rouleau = { ...currentLayout.rouleau, ...value };
      } else if (field.startsWith('rouleau.')) {
        const rouleauField = field.split('.')[1];
        updatedLayout.rouleau = {
          ...currentLayout.rouleau,
          [rouleauField]: parseFloat(value) || 0,
        };
      } else {
        updatedLayout[field] = parseFloat(value) || 0;
      }

      setCurrentLayout(updatedLayout);
    },
    [currentLayout]
  );

  const handleSupportTypeChange = useCallback(
    (newType) => {
      const supportType = supportTypes.find((t) => t.id === newType);
      if (!supportType) return;

      const newLayout = { ...currentLayout, supportType: newType, ...supportType.defaults };
      setCurrentLayout(newLayout);
    },
    [currentLayout, supportTypes]
  );

  const calculateGridDimensions = useCallback(() => {
    const pageWidth = 210;
    const pageHeight = 297;
    const usableWidth = pageWidth - currentLayout.offsetLeft * 2;
    const usableHeight = pageHeight - currentLayout.offsetTop * 2;
    const columns = Math.floor(usableWidth / (currentLayout.width + currentLayout.spacingH));
    const rows = Math.floor(usableHeight / (currentLayout.height + currentLayout.spacingV));
    return { columns, rows, total: columns * rows };
  }, [currentLayout]);

  const saveStylePreset = useCallback(
    async (presetName, isPublic = false) => {
      if (!presetName.trim()) return false;
      try {
        const configData = { style: { ...labelStyle } };
        const newPreset = await userPresetService.savePreset(
          LABEL_STYLE_CATEGORY,
          presetName,
          configData,
          isPublic
        );
        const updatedPresets = await userPresetService.refreshPresets(LABEL_STYLE_CATEGORY);
        setSavedStylePresets(updatedPresets);
        return newPreset;
      } catch (error) {
        return false;
      }
    },
    [labelStyle]
  );

  const loadStylePreset = useCallback(
    async (presetId) => {
      try {
        const preset = await userPresetService.loadPreset(
          LABEL_STYLE_CATEGORY,
          presetId,
          savedStylePresets
        );
        if (!preset) return false;
        const { style } = preset.preset_data;
        if (style) {
          setLabelStyle({ ...DEFAULT_STYLE, ...style });
        }
        return true;
      } catch (error) {
        return false;
      }
    },
    [savedStylePresets]
  );

  const deleteStylePreset = useCallback(async (presetId) => {
    try {
      await userPresetService.deletePreset(LABEL_STYLE_CATEGORY, presetId);
      const updatedPresets = await userPresetService.refreshPresets(LABEL_STYLE_CATEGORY);
      setSavedStylePresets(updatedPresets);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const saveLayoutPreset = useCallback(
    async (presetName, isPublic = false) => {
      if (!presetName.trim()) return false;
      try {
        const layoutData = { ...currentLayout };
        const metadata = { support_type: currentLayout.supportType || 'A4' };
        const newPreset = await userPresetService.savePreset(
          PRINT_LAYOUT_CATEGORY,
          presetName,
          layoutData,
          isPublic,
          metadata
        );
        const updatedPresets = await userPresetService.refreshPresets(PRINT_LAYOUT_CATEGORY);
        setSavedLayoutPresets(updatedPresets);
        return newPreset;
      } catch (error) {
        return false;
      }
    },
    [currentLayout]
  );

  const loadLayoutPreset = useCallback(
    async (presetId) => {
      try {
        const preset = await userPresetService.loadPreset(
          PRINT_LAYOUT_CATEGORY,
          presetId,
          savedLayoutPresets
        );
        if (!preset) return false;
        const layoutData = preset.preset_data;
        if (layoutData) {
          const newLayout = {
            ...DEFAULT_LAYOUT,
            ...layoutData,
            rouleau: { ...DEFAULT_LAYOUT.rouleau, ...layoutData.rouleau },
          };
          setCurrentLayout(newLayout);
        }
        return true;
      } catch (error) {
        return false;
      }
    },
    [savedLayoutPresets]
  );

  const deleteLayoutPreset = useCallback(async (presetId) => {
    try {
      await userPresetService.deletePreset(PRINT_LAYOUT_CATEGORY, presetId);
      const updatedPresets = await userPresetService.refreshPresets(PRINT_LAYOUT_CATEGORY);
      setSavedLayoutPresets(updatedPresets);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const resetForm = useCallback(() => {
    setLoading(false);
    setLabelStyle(DEFAULT_STYLE);
    setCurrentLayout(DEFAULT_LAYOUT);
    setDisabledCells(new Set());
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [isOpen, generateExportTitle]);

  return {
    exportTitle,
    setExportTitle,
    loading,
    setLoading,
    extractLabelData,
    buildLabelLayout,
    labelStyle,
    handleStyleChange,
    savedStylePresets,
    saveStylePreset,
    loadStylePreset,
    deleteStylePreset,
    currentLayout,
    handleLayoutChange,
    handleSupportTypeChange,
    supportTypes,
    savedLayoutPresets,
    saveLayoutPreset,
    loadLayoutPreset,
    deleteLayoutPreset,
    calculateGridDimensions,
    enableCellSelection,
    setEnableCellSelection,
    disabledCells,
    setDisabledCells,
    resetForm,
    generateExportTitle,
  };
};

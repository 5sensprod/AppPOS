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
  // ✅ États de base export
  const [exportTitle, setExportTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ États style étiquettes (fusionné de useLabelConfiguration)
  const [labelStyle, setLabelStyle] = useState(DEFAULT_STYLE);
  const [savedStylePresets, setSavedStylePresets] = useState([]);
  const [enableCellSelection, setEnableCellSelection] = useState(false);
  const [disabledCells, setDisabledCells] = useState(new Set());

  // ✅ États layout impression (fusionné de usePrintLayoutConfiguration)
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
      defaults: { width: 50, height: 30, offsetTop: 5, offsetLeft: 5, spacingV: 2, spacingH: 0 },
    },
    {
      id: 'custom',
      name: 'Format personnalisé',
      description: 'Dimensions sur mesure',
      defaults: { width: 50, height: 25, offsetTop: 10, offsetLeft: 10, spacingV: 0, spacingH: 0 },
    },
  ]);

  // ✅ CHARGEMENT INITIAL
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger style depuis localStorage
        const savedStyle = localStorage.getItem('labelStyleSettings');
        if (savedStyle) {
          setLabelStyle({ ...DEFAULT_STYLE, ...JSON.parse(savedStyle) });
        }

        // Charger layout depuis localStorage
        const savedLayout = localStorage.getItem('printLayoutSettings');
        if (savedLayout) {
          const parsed = JSON.parse(savedLayout);
          const completeLayout = {
            ...DEFAULT_LAYOUT,
            ...parsed,
            rouleau: { ...DEFAULT_LAYOUT.rouleau, ...parsed.rouleau },
          };
          setCurrentLayout(completeLayout);
        }

        // Charger presets style
        const stylePresets = await userPresetService.refreshPresets(LABEL_STYLE_CATEGORY);
        setSavedStylePresets(stylePresets);

        // Charger presets layout
        const layoutPresets = await userPresetService.refreshPresets(PRINT_LAYOUT_CATEGORY);
        setSavedLayoutPresets(layoutPresets);
      } catch (error) {
        console.warn('Erreur chargement configurations étiquettes:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // ✅ GÉNÉRATION TITRE
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

  // ✅ EXTRACTION DONNÉES ÉTIQUETTES
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

  // ✅ CONSTRUCTION LAYOUT FINAL
  const buildLabelLayout = useCallback(() => {
    return {
      layout: currentLayout,
      style: labelStyle,
      disabledCells: Array.from(disabledCells),
    };
  }, [currentLayout, labelStyle, disabledCells]);

  // ✅ GESTION STYLE
  const handleStyleChange = useCallback(
    (newStyle) => {
      const updatedStyle = { ...labelStyle, ...newStyle };
      setLabelStyle(updatedStyle);

      try {
        localStorage.setItem('labelStyleSettings', JSON.stringify(updatedStyle));
      } catch (error) {
        console.warn('Erreur sauvegarde style local:', error);
      }
    },
    [labelStyle]
  );

  // ✅ GESTION LAYOUT
  const handleLayoutChange = useCallback(
    (field, value) => {
      let updatedLayout = { ...currentLayout };

      if (field === 'rouleau') {
        updatedLayout.rouleau = {
          ...currentLayout.rouleau,
          ...value,
        };
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

      try {
        localStorage.setItem('printLayoutSettings', JSON.stringify(updatedLayout));
      } catch (error) {
        console.warn('Erreur sauvegarde layout local:', error);
      }
    },
    [currentLayout]
  );

  // ✅ CHANGEMENT TYPE SUPPORT
  const handleSupportTypeChange = useCallback(
    (newType) => {
      const supportType = supportTypes.find((t) => t.id === newType);
      if (!supportType) return;

      const newLayout = {
        ...currentLayout,
        supportType: newType,
        ...supportType.defaults,
      };

      setCurrentLayout(newLayout);

      try {
        localStorage.setItem('printLayoutSettings', JSON.stringify(newLayout));
      } catch (error) {
        console.warn('Erreur sauvegarde layout local:', error);
      }
    },
    [currentLayout, supportTypes]
  );

  // ✅ CALCUL DIMENSIONS GRILLE
  const calculateGridDimensions = useCallback(() => {
    const pageWidth = 210;
    const pageHeight = 297;
    const usableWidth = pageWidth - currentLayout.offsetLeft * 2;
    const usableHeight = pageHeight - currentLayout.offsetTop * 2;
    const columns = Math.floor(usableWidth / (currentLayout.width + currentLayout.spacingH));
    const rows = Math.floor(usableHeight / (currentLayout.height + currentLayout.spacingV));
    return { columns, rows, total: columns * rows };
  }, [currentLayout]);

  // ✅ PRESETS STYLE
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
        console.error('Erreur sauvegarde preset style:', error);
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
          localStorage.setItem('labelStyleSettings', JSON.stringify(style));
        }
        return true;
      } catch (error) {
        console.error('Erreur chargement preset style:', error);
        return false;
      }
    },
    [savedStylePresets]
  );

  // ✅ PRESETS LAYOUT
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
        console.error('Erreur sauvegarde preset layout:', error);
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
          localStorage.setItem('printLayoutSettings', JSON.stringify(newLayout));
        }
        return true;
      } catch (error) {
        console.error('Erreur chargement preset layout:', error);
        return false;
      }
    },
    [savedLayoutPresets]
  );

  // ✅ RÉINITIALISATION
  const resetForm = useCallback(() => {
    setLoading(false);
    setLabelStyle(DEFAULT_STYLE);
    setCurrentLayout(DEFAULT_LAYOUT);
    setDisabledCells(new Set());
    try {
      localStorage.removeItem('labelStyleSettings');
      localStorage.removeItem('printLayoutSettings');
    } catch (error) {
      console.warn('Erreur réinitialisation:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateExportTitle();
    }
  }, [isOpen, generateExportTitle]);

  return {
    // États de base
    exportTitle,
    setExportTitle,
    loading,
    setLoading,

    // Données étiquettes
    extractLabelData,
    buildLabelLayout,

    // Style étiquettes
    labelStyle,
    handleStyleChange,
    savedStylePresets,
    saveStylePreset,
    loadStylePreset,

    // Layout impression
    currentLayout,
    handleLayoutChange,
    handleSupportTypeChange,
    supportTypes,
    savedLayoutPresets,
    saveLayoutPreset,
    loadLayoutPreset,
    calculateGridDimensions,

    // Cases désactivées
    enableCellSelection,
    setEnableCellSelection,
    disabledCells,
    setDisabledCells,

    // Actions
    resetForm,
    generateExportTitle,
  };
};

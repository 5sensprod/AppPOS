// 📁 hooks/useLabelConfiguration.js
import { useState, useEffect, useCallback } from 'react';
import userPresetService from '../../../../../../../../services/userPresetService';

const CATEGORY = 'label_style';

// Valeurs par défaut
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
  contentRotation: 0,
};

export const useLabelConfiguration = (onLayoutChange) => {
  const [customLayout, setCustomLayout] = useState({
    width: 48.5,
    height: 25,
    offsetTop: 22,
    offsetLeft: 8,
    spacingV: 0,
    spacingH: 0,
  });

  const [labelStyle, setLabelStyle] = useState(DEFAULT_STYLE);
  const [savedPresets, setSavedPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enableCellSelection, setEnableCellSelection] = useState(false);
  const [disabledCells, setDisabledCells] = useState(new Set());

  // 📥 CHARGER au démarrage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Charger le style depuis localStorage (fallback)
        const savedStyle = localStorage.getItem('labelStyleSettings');
        if (savedStyle) {
          setLabelStyle({ ...DEFAULT_STYLE, ...JSON.parse(savedStyle) });
        }

        // Charger les presets depuis l'API générique
        const presets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(presets);

        console.log('✅ Configuration étiquettes chargée:', {
          styleLocal: !!savedStyle,
          presetsAPI: presets.length,
        });
      } catch (error) {
        console.warn('⚠️ Erreur chargement configurations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const calculateGridDimensions = () => {
    const pageWidth = 210;
    const pageHeight = 297;
    const usableWidth = pageWidth - customLayout.offsetLeft * 2;
    const usableHeight = pageHeight - customLayout.offsetTop * 2;
    const columns = Math.floor(usableWidth / (customLayout.width + customLayout.spacingH));
    const rows = Math.floor(usableHeight / (customLayout.height + customLayout.spacingV));
    return { columns, rows, total: columns * rows };
  };

  const handleCustomLayoutChange = (field, value) => {
    const newLayout = { ...customLayout, [field]: parseFloat(value) || 0 };
    setCustomLayout(newLayout);

    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: newLayout,
        style: labelStyle,
        disabledCells: Array.from(disabledCells),
      });
    }
  };

  // 💾 SAUVEGARDER automatiquement le style (localStorage pour réactivité)
  const handleStyleChange = useCallback(
    (newStyle) => {
      const updatedStyle = { ...labelStyle, ...newStyle };
      setLabelStyle(updatedStyle);

      try {
        localStorage.setItem('labelStyleSettings', JSON.stringify(updatedStyle));
      } catch (error) {
        console.warn('⚠️ Erreur sauvegarde style local:', error);
      }

      if (onLayoutChange) {
        onLayoutChange({
          preset: 'custom',
          layout: customLayout,
          style: updatedStyle,
          disabledCells: Array.from(disabledCells),
        });
      }
    },
    [labelStyle, customLayout, disabledCells, onLayoutChange]
  );

  // 💾 SAUVEGARDER un preset via API générique
  const savePreset = useCallback(
    async (presetName, isPublic = false) => {
      if (!presetName.trim()) return false;

      setLoading(true);
      try {
        const configData = {
          style: { ...labelStyle },
          layout: { ...customLayout },
        };

        const newPreset = await userPresetService.savePreset(
          CATEGORY,
          presetName,
          configData,
          isPublic
        );

        // Rafraîchir la liste locale
        const updatedPresets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(updatedPresets);

        return newPreset;
      } catch (error) {
        console.error('❌ Erreur sauvegarde preset:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [labelStyle, customLayout]
  );

  // 📂 CHARGER un preset via API générique
  const loadPreset = useCallback(
    async (presetId) => {
      setLoading(true);
      try {
        const preset = await userPresetService.loadPreset(CATEGORY, presetId, savedPresets);
        if (!preset) return false;

        const { style, layout } = preset.preset_data;

        if (style) {
          setLabelStyle({ ...DEFAULT_STYLE, ...style });
          // Sauvegarder aussi en local
          localStorage.setItem('labelStyleSettings', JSON.stringify(style));
        }

        if (layout) {
          setCustomLayout({ ...customLayout, ...layout });
        }

        if (onLayoutChange) {
          onLayoutChange({
            preset: 'custom',
            layout: layout || customLayout,
            style: style || labelStyle,
            disabledCells: Array.from(disabledCells),
          });
        }

        return true;
      } catch (error) {
        console.error('❌ Erreur chargement preset:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [savedPresets, customLayout, labelStyle, disabledCells, onLayoutChange]
  );

  // 🗑️ SUPPRIMER un preset via API générique
  const deletePreset = useCallback(async (presetId) => {
    setLoading(true);
    try {
      await userPresetService.deletePreset(CATEGORY, presetId);

      // Rafraîchir la liste locale
      const updatedPresets = await userPresetService.refreshPresets(CATEGORY);
      setSavedPresets(updatedPresets);

      return true;
    } catch (error) {
      console.error('❌ Erreur suppression preset:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔄 RÉINITIALISER le style
  const resetStyle = useCallback(() => {
    setLabelStyle(DEFAULT_STYLE);
    try {
      localStorage.removeItem('labelStyleSettings');
    } catch (error) {
      console.warn('⚠️ Erreur réinitialisation:', error);
    }
  }, []);

  return {
    customLayout,
    labelStyle,
    savedPresets,
    loading,
    enableCellSelection,
    disabledCells,
    setEnableCellSelection,
    setDisabledCells,
    calculateGridDimensions,
    handleCustomLayoutChange,
    handleStyleChange,

    // 🆕 Fonctions pour presets via API générique
    savePreset,
    loadPreset,
    deletePreset,
    resetStyle,
  };
};

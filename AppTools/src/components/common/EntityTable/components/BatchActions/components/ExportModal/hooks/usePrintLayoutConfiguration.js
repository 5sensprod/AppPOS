// 📁 hooks/usePrintLayoutConfiguration.js
import { useState, useEffect, useCallback } from 'react';
import userPresetService from '../../../../../../../../services/userPresetService';

const CATEGORY = 'print_layout';

// Valeurs par défaut pour A4
const DEFAULT_LAYOUT = {
  width: 48.5,
  height: 25,
  offsetTop: 22,
  offsetLeft: 8,
  spacingV: 0,
  spacingH: 0,
  supportType: 'A4',
};

export const usePrintLayoutConfiguration = (onLayoutChange) => {
  const [currentLayout, setCurrentLayout] = useState(DEFAULT_LAYOUT);
  const [savedPresets, setSavedPresets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [supportTypes] = useState([
    {
      id: 'A4',
      name: 'A4 (210×297mm)',
      description: 'Feuille A4 standard',
    },
    {
      id: 'rouleau',
      name: "Rouleau d'étiquettes",
      description: 'Support rouleau continu',
    },
    {
      id: 'custom',
      name: 'Format personnalisé',
      description: 'Dimensions sur mesure',
    },
  ]);

  // 📥 CHARGER au démarrage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Charger layout depuis localStorage (fallback)
        const savedLayout = localStorage.getItem('printLayoutSettings');
        if (savedLayout) {
          setCurrentLayout({ ...DEFAULT_LAYOUT, ...JSON.parse(savedLayout) });
        }

        // Charger les presets depuis l'API
        const presets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(presets);

        console.log('✅ Configuration layout chargée:', {
          layoutLocal: !!savedLayout,
          presetsAPI: presets.length,
        });
      } catch (error) {
        console.warn('⚠️ Erreur chargement configurations layout:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 💾 SAUVEGARDER automatiquement le layout (localStorage pour réactivité)
  const handleLayoutChange = useCallback(
    (field, value) => {
      const updatedLayout = {
        ...currentLayout,
        [field]: parseFloat(value) || 0,
      };
      setCurrentLayout(updatedLayout);

      try {
        localStorage.setItem('printLayoutSettings', JSON.stringify(updatedLayout));
      } catch (error) {
        console.warn('⚠️ Erreur sauvegarde layout local:', error);
      }

      // Notifier le parent
      if (onLayoutChange) {
        onLayoutChange(updatedLayout);
      }
    },
    [currentLayout, onLayoutChange]
  );

  // 💾 SAUVEGARDER un preset via API générique
  const savePreset = useCallback(
    async (presetName, isPublic = false) => {
      if (!presetName.trim()) return false;

      setLoading(true);
      try {
        const layoutData = { ...currentLayout };
        const metadata = { support_type: currentLayout.supportType || 'A4' };

        const newPreset = await userPresetService.savePreset(
          CATEGORY,
          presetName,
          layoutData,
          isPublic,
          metadata
        );

        // Rafraîchir la liste locale
        const updatedPresets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(updatedPresets);

        return newPreset;
      } catch (error) {
        console.error('❌ Erreur sauvegarde preset layout:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentLayout]
  );

  // 📂 CHARGER un preset via API générique
  const loadPreset = useCallback(
    async (presetId) => {
      setLoading(true);
      try {
        const preset = await userPresetService.loadPreset(CATEGORY, presetId, savedPresets);
        if (!preset) return false;

        const layoutData = preset.preset_data;

        if (layoutData) {
          const newLayout = { ...DEFAULT_LAYOUT, ...layoutData };
          setCurrentLayout(newLayout);

          // Sauvegarder aussi en local
          localStorage.setItem('printLayoutSettings', JSON.stringify(newLayout));

          // Notifier le parent
          if (onLayoutChange) {
            onLayoutChange(newLayout);
          }
        }

        return true;
      } catch (error) {
        console.error('❌ Erreur chargement preset layout:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [savedPresets, onLayoutChange]
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
      console.error('❌ Erreur suppression preset layout:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔄 RÉINITIALISER le layout
  const resetLayout = useCallback(() => {
    setCurrentLayout(DEFAULT_LAYOUT);
    try {
      localStorage.removeItem('printLayoutSettings');
    } catch (error) {
      console.warn('⚠️ Erreur réinitialisation layout:', error);
    }

    if (onLayoutChange) {
      onLayoutChange(DEFAULT_LAYOUT);
    }
  }, [onLayoutChange]);

  // 📏 CALCULER les dimensions de grille
  const calculateGridDimensions = useCallback(() => {
    const pageWidth = 210; // A4 en mm
    const pageHeight = 297;
    const usableWidth = pageWidth - currentLayout.offsetLeft * 2;
    const usableHeight = pageHeight - currentLayout.offsetTop * 2;
    const columns = Math.floor(usableWidth / (currentLayout.width + currentLayout.spacingH));
    const rows = Math.floor(usableHeight / (currentLayout.height + currentLayout.spacingV));
    return { columns, rows, total: columns * rows };
  }, [currentLayout]);

  return {
    currentLayout,
    savedPresets,
    supportTypes,
    loading,
    calculateGridDimensions,
    handleLayoutChange,

    // 🆕 Fonctions pour presets via API générique
    savePreset,
    loadPreset,
    deletePreset,
    resetLayout,
  };
};

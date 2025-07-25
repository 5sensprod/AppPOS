// 📁 hooks/usePrintLayoutConfiguration.js - Version nettoyée
import { useState, useEffect, useCallback } from 'react';
import userPresetService from '../../../../../../../../services/userPresetService';

const CATEGORY = 'print_layout';

const DEFAULT_LAYOUT = {
  width: 48.5,
  height: 25,
  offsetTop: 22,
  offsetLeft: 8,
  spacingV: 0,
  spacingH: 0,
  supportType: 'A4',
  rouleau: { width: 58 },
  cutPerLabel: false,
  labelsPerGroup: 3,
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
      defaults: { width: 48.5, height: 25, offsetTop: 22, offsetLeft: 8, spacingV: 0, spacingH: 0 },
    },
    {
      id: 'rouleau',
      name: "Rouleau d'étiquettes",
      description: 'Support rouleau continu',
      defaults: { width: 50, height: 30, offsetTop: 5, offsetLeft: 5, spacingV: 2, spacingH: 0 },
    },
    {
      id: 'custom',
      name: 'Format personnalisé',
      description: 'Dimensions sur mesure',
      defaults: { width: 50, height: 25, offsetTop: 10, offsetLeft: 10, spacingV: 0, spacingH: 0 },
    },
  ]);

  // Charger au démarrage
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
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

        const presets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(presets);
      } catch (error) {
        console.warn('Erreur chargement configurations layout:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Changement de type de support
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

      if (onLayoutChange) {
        onLayoutChange(newLayout);
      }
    },
    [currentLayout, onLayoutChange, supportTypes]
  );

  // Changement de layout
  const handleLayoutChange = useCallback(
    (field, value) => {
      let updatedLayout = { ...currentLayout };

      // ✅ Gestion spéciale pour les nouvelles options
      if (field === 'cutMode') {
        // Quand on change le mode via le composant EnhancedCutOptions
        updatedLayout = { ...currentLayout, ...value };
      }
      // ✅ Gestion des booléens
      else if (field === 'cutPerLabel') {
        updatedLayout.cutPerLabel = !!value;
      }
      // ✅ Gestion des entiers
      else if (field === 'labelsPerGroup') {
        updatedLayout.labelsPerGroup = parseInt(value) || 3;
      }
      // 🧩 Gérer rouleau.{...}
      else if (field === 'rouleau') {
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

      if (onLayoutChange) {
        onLayoutChange(updatedLayout);
      }
    },
    [currentLayout, onLayoutChange]
  );

  // Sauvegarder un preset
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

        const updatedPresets = await userPresetService.refreshPresets(CATEGORY);
        setSavedPresets(updatedPresets);

        return newPreset;
      } catch (error) {
        console.error('Erreur sauvegarde preset layout:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentLayout]
  );

  // Charger un preset
  const loadPreset = useCallback(
    async (presetId) => {
      setLoading(true);
      try {
        const preset = await userPresetService.loadPreset(CATEGORY, presetId, savedPresets);
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

          if (onLayoutChange) {
            onLayoutChange(newLayout);
          }
        }

        return true;
      } catch (error) {
        console.error('Erreur chargement preset layout:', error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [savedPresets, onLayoutChange]
  );

  // Supprimer un preset
  const deletePreset = useCallback(async (presetId) => {
    setLoading(true);
    try {
      await userPresetService.deletePreset(CATEGORY, presetId);
      const updatedPresets = await userPresetService.refreshPresets(CATEGORY);
      setSavedPresets(updatedPresets);
      return true;
    } catch (error) {
      console.error('Erreur suppression preset layout:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Réinitialiser le layout
  const resetLayout = useCallback(() => {
    setCurrentLayout(DEFAULT_LAYOUT);
    try {
      localStorage.removeItem('printLayoutSettings');
    } catch (error) {
      console.warn('Erreur réinitialisation layout:', error);
    }

    if (onLayoutChange) {
      onLayoutChange(DEFAULT_LAYOUT);
    }
  }, [onLayoutChange]);

  // Calculer les dimensions de grille
  const calculateGridDimensions = useCallback(() => {
    const pageWidth = 210;
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
    handleSupportTypeChange,
    savePreset,
    loadPreset,
    deletePreset,
    resetLayout,
  };
};

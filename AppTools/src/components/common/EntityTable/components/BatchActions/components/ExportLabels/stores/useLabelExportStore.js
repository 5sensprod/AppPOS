// stores/useLabelExportStore.js - LOGIQUE LOCALSTORAGE SIMPLIFIÉE

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import userPresetService from '../../../../../../../../services/userPresetService';
import { calculateGridDimensions, generateExportTitle } from '../utils/labelUtils';

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

const DEFAULT_ROLL_LAYOUT = {
  width: 50,
  height: 30,
  offsetTop: 5,
  offsetLeft: 5,
  spacingV: 2,
  spacingH: 0,
  supportType: 'rouleau',
  rouleau: { width: 58 },
};

const SUPPORT_TYPES = [
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
];

export const useLabelExportStore = create(
  persist(
    (set, get) => ({
      // ===== ÉTAT PRINCIPAL =====
      labelStyle: DEFAULT_STYLE,
      currentLayout: DEFAULT_LAYOUT,
      exportTitle: '',

      // ❌ États JAMAIS persistés (toujours reset au montage)
      loading: false,
      enableCellSelection: false, // ❌ Toujours false au démarrage
      disabledCells: new Set(), // ❌ Toujours vide au démarrage

      // Les presets et données contextuelles ne sont pas persistés non plus
      savedStylePresets: [],
      savedLayoutPresets: [],
      selectedItems: [],
      productsData: [],
      activeFilters: [],
      entityNamePlural: '',

      // ===== NOUVEAUX ÉTATS POUR IMPRESSION DIRECTE =====
      availablePrinters: [],
      selectedPrinter: null,
      loadingPrinters: false,
      printing: false,
      printError: null,

      // ===== ACTIONS STYLE =====
      updateStyle: (newStyle) =>
        set((state) => ({
          labelStyle: { ...state.labelStyle, ...newStyle },
        })),

      resetStyleOnly: () =>
        set((state) => ({
          labelStyle: {
            ...DEFAULT_STYLE,
            duplicateCount: state.labelStyle.duplicateCount, // Préservé en session seulement
          },
        })),

      setDuplicateCount: (count) =>
        set((state) => ({
          labelStyle: { ...state.labelStyle, duplicateCount: count },
        })),

      // ===== ACTIONS LAYOUT =====
      updateLayout: (field, value) =>
        set((state) => {
          let updatedLayout = { ...state.currentLayout };

          if (field === 'rouleau') {
            updatedLayout.rouleau = { ...state.currentLayout.rouleau, ...value };
          } else if (field.startsWith('rouleau.')) {
            const rouleauField = field.split('.')[1];
            updatedLayout.rouleau = {
              ...state.currentLayout.rouleau,
              [rouleauField]: parseFloat(value) || 0,
            };
          } else {
            updatedLayout[field] = parseFloat(value) || 0;
          }

          return { currentLayout: updatedLayout };
        }),

      changeSupportType: (newType) =>
        set((state) => {
          const supportType = SUPPORT_TYPES.find((t) => t.id === newType);
          if (!supportType) return state;

          return {
            currentLayout: {
              ...state.currentLayout,
              supportType: newType,
              ...supportType.defaults,
            },
          };
        }),

      resetA4LayoutOnly: () =>
        set({
          currentLayout: {
            ...DEFAULT_LAYOUT,
            supportType: 'A4',
          },
        }),

      resetRollLayoutOnly: () =>
        set({
          currentLayout: DEFAULT_ROLL_LAYOUT,
        }),

      resetCustomPositionsOnly: () =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customPositions: {},
          },
        })),

      // ===== ACTIONS SÉLECTION DE CELLULES =====
      setEnableCellSelection: (enabled) =>
        set({
          enableCellSelection: enabled,
          disabledCells: enabled ? get().disabledCells : new Set(),
        }),

      toggleCellSelection: (cellIndex) =>
        set((state) => {
          const newDisabledCells = new Set(state.disabledCells);
          if (newDisabledCells.has(cellIndex)) {
            newDisabledCells.delete(cellIndex);
          } else {
            newDisabledCells.add(cellIndex);
          }
          return { disabledCells: newDisabledCells };
        }),

      clearCellSelection: () => set({ disabledCells: new Set() }),

      // ===== ACTIONS PRESETS =====
      loadStylePresets: async () => {
        try {
          const presets = await userPresetService.refreshPresets(LABEL_STYLE_CATEGORY);
          set({ savedStylePresets: presets });
        } catch (error) {
          console.error('Erreur chargement presets style:', error);
        }
      },

      saveStylePreset: async (presetName, isPublic = false) => {
        try {
          const { labelStyle } = get();
          // ❌ Ne pas inclure duplicateCount dans les presets
          const { duplicateCount, ...styleToSave } = labelStyle;
          const configData = { style: styleToSave };

          await userPresetService.savePreset(
            LABEL_STYLE_CATEGORY,
            presetName,
            configData,
            isPublic
          );

          get().loadStylePresets();
          return true;
        } catch (error) {
          console.error('Erreur sauvegarde preset style:', error);
          return false;
        }
      },

      loadStylePreset: async (presetId) => {
        try {
          const { savedStylePresets, labelStyle } = get();
          const preset = await userPresetService.loadPreset(
            LABEL_STYLE_CATEGORY,
            presetId,
            savedStylePresets
          );

          if (preset?.preset_data?.style) {
            const loadedStyle = {
              ...DEFAULT_STYLE,
              ...preset.preset_data.style,
              duplicateCount: labelStyle.duplicateCount, // Préserver le count actuel
            };
            set({ labelStyle: loadedStyle });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Erreur chargement preset style:', error);
          return false;
        }
      },

      deleteStylePreset: async (presetId) => {
        try {
          await userPresetService.deletePreset(LABEL_STYLE_CATEGORY, presetId);
          get().loadStylePresets();
          return true;
        } catch (error) {
          console.error('Erreur suppression preset style:', error);
          return false;
        }
      },

      // Layout presets
      loadLayoutPresets: async () => {
        try {
          const presets = await userPresetService.refreshPresets(PRINT_LAYOUT_CATEGORY);
          set({ savedLayoutPresets: presets });
        } catch (error) {
          console.error('Erreur chargement presets layout:', error);
        }
      },

      saveLayoutPreset: async (presetName, isPublic = false) => {
        try {
          const { currentLayout } = get();
          const metadata = { support_type: currentLayout.supportType || 'A4' };

          await userPresetService.savePreset(
            PRINT_LAYOUT_CATEGORY,
            presetName,
            currentLayout,
            isPublic,
            metadata
          );

          get().loadLayoutPresets();
          return true;
        } catch (error) {
          console.error('Erreur sauvegarde preset layout:', error);
          return false;
        }
      },

      loadLayoutPreset: async (presetId) => {
        try {
          const { savedLayoutPresets } = get();
          const preset = await userPresetService.loadPreset(
            PRINT_LAYOUT_CATEGORY,
            presetId,
            savedLayoutPresets
          );

          if (preset?.preset_data) {
            const newLayout = {
              ...DEFAULT_LAYOUT,
              ...preset.preset_data,
              rouleau: { ...DEFAULT_LAYOUT.rouleau, ...preset.preset_data.rouleau },
            };
            set({ currentLayout: newLayout });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Erreur chargement preset layout:', error);
          return false;
        }
      },

      deleteLayoutPreset: async (presetId) => {
        try {
          await userPresetService.deletePreset(PRINT_LAYOUT_CATEGORY, presetId);
          get().loadLayoutPresets();
          return true;
        } catch (error) {
          console.error('Erreur suppression preset layout:', error);
          return false;
        }
      },

      // ===== NOUVELLES ACTIONS POUR IMPRESSION DIRECTE =====

      /**
       * Charger les imprimantes disponibles
       */
      loadAvailablePrinters: async () => {
        set({ loadingPrinters: true, printError: null });
        try {
          const RollLabelRenderer = (await import('../services/RollLabelRenderer')).default;
          const printers = await RollLabelRenderer.getAvailablePrinters();

          set({
            availablePrinters: printers,
            // Sélectionner automatiquement l'imprimante par défaut
            selectedPrinter: printers.find((p) => p.Default) || printers[0] || null,
          });

          console.log(`🖨️ [STORE] ${printers.length} imprimante(s) chargée(s)`);
        } catch (error) {
          console.error('❌ [STORE] Erreur chargement imprimantes:', error);
          set({ printError: error.message });
        } finally {
          set({ loadingPrinters: false });
        }
      },

      /**
       * Sélectionner une imprimante
       */
      selectPrinter: (printer) => {
        set({ selectedPrinter: printer });
        console.log('🖨️ [STORE] Imprimante sélectionnée:', printer?.Name);
      },

      /**
       * Impression directe des étiquettes
       */
      printLabelsDirectly: async () => {
        const {
          selectedItems,
          currentLayout,
          labelStyle,
          selectedPrinter,
          extractLabelData,
          buildLabelLayout,
        } = get();

        if (!selectedItems.length) {
          throw new Error('Aucune étiquette sélectionnée');
        }

        if (currentLayout.supportType !== 'rouleau') {
          throw new Error("L'impression directe n'est disponible qu'en mode rouleau");
        }

        set({ printing: true, printError: null });

        try {
          const RollLabelRenderer = (await import('../services/RollLabelRenderer')).default;

          const printConfig = {
            labelData: extractLabelData(),
            labelLayout: buildLabelLayout(),
            printerName: selectedPrinter?.Name,
            copies: 1,
          };

          console.log('🖨️ [STORE] Début impression directe...', printConfig);

          const result = await RollLabelRenderer.printLabelsDirectly(printConfig);

          console.log('✅ [STORE] Impression terminée:', result);

          return result;
        } catch (error) {
          console.error('❌ [STORE] Erreur impression:', error);
          set({ printError: error.message });
          throw error;
        } finally {
          set({ printing: false });
        }
      },

      /**
       * Reset des états d'impression
       */
      resetPrintState: () =>
        set({
          printError: null,
          printing: false,
        }),

      // ===== UTILITAIRES =====
      setExportTitle: (title) => set({ exportTitle: title }),

      generateExportTitle: () => {
        const { activeFilters, entityNamePlural } = get();
        const title = generateExportTitle(activeFilters, entityNamePlural);
        set({ exportTitle: title });
      },

      extractLabelData: () => {
        const { selectedItems, productsData } = get();

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
      },

      buildLabelLayout: () => {
        const { currentLayout, labelStyle, disabledCells } = get();
        return {
          layout: currentLayout,
          style: labelStyle,
          disabledCells: Array.from(disabledCells),
        };
      },

      getGridDimensions: () => {
        const { currentLayout } = get();
        return calculateGridDimensions(currentLayout);
      },

      getSupportTypes: () => SUPPORT_TYPES,

      // ===== INITIALISATION SIMPLIFIÉE =====
      initializeForModal: (selectedItems, productsData, activeFilters, entityNamePlural) => {
        set((state) => ({
          selectedItems,
          productsData,
          activeFilters,
          entityNamePlural,
          // ✅ RESET explicite des états non-persistés
          loading: false,
          enableCellSelection: false,
          disabledCells: new Set(),
          // ✅ RESET du duplicateCount à 1 à chaque montage
          labelStyle: {
            ...state.labelStyle,
            duplicateCount: 1,
          },
        }));

        get().loadStylePresets();
        get().loadLayoutPresets();
        get().generateExportTitle();
      },

      resetTemporaryState: () =>
        set({
          loading: false,
          enableCellSelection: false,
          disabledCells: new Set(),
        }),

      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'label-export-config',
      // 🎯 CONFIGURATION SIMPLIFIÉE : Persister seulement ce qui doit l'être
      partialize: (state) => {
        const { duplicateCount, ...styleWithoutCount } = state.labelStyle;

        return {
          labelStyle: styleWithoutCount,
          currentLayout: state.currentLayout,
          selectedPrinter: state.selectedPrinter, // Persister le choix d'imprimante
          // Ne PAS persister: availablePrinters, printing, printError, etc.
        };
      },
    }
  )
);

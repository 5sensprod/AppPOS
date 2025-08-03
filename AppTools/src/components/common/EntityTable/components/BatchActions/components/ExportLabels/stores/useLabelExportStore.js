// stores/useLabelExportStore.js - VERSION NETTOYÉE
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

      // États non-persistés (reset à chaque ouverture)
      loading: false,
      enableCellSelection: false,
      disabledCells: new Set(),

      // Presets (chargés depuis l'API)
      savedStylePresets: [],
      savedLayoutPresets: [],

      // Données contextuelles
      selectedItems: [],
      productsData: [],
      activeFilters: [],
      entityNamePlural: '',

      // ===== ACTIONS STYLE =====
      updateStyle: (newStyle) =>
        set((state) => ({
          labelStyle: { ...state.labelStyle, ...newStyle },
        })),

      // 🎯 Reset uniquement le style (préserve duplicateCount)
      resetStyleOnly: () =>
        set((state) => ({
          labelStyle: {
            ...DEFAULT_STYLE,
            duplicateCount: state.labelStyle.duplicateCount,
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

      // 🎯 Reset layout A4 spécifiquement
      resetA4LayoutOnly: () =>
        set({
          currentLayout: {
            ...DEFAULT_LAYOUT,
            supportType: 'A4',
          },
        }),

      // 🎯 Reset layout Rouleau spécifiquement
      resetRollLayoutOnly: () =>
        set({
          currentLayout: DEFAULT_ROLL_LAYOUT,
        }),

      // 🎯 Reset uniquement les positions personnalisées
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
          const configData = { style: { ...labelStyle } };

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
          const { savedStylePresets } = get();
          const preset = await userPresetService.loadPreset(
            LABEL_STYLE_CATEGORY,
            presetId,
            savedStylePresets
          );

          if (preset?.preset_data?.style) {
            const loadedStyle = { ...DEFAULT_STYLE, ...preset.preset_data.style };
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

      // Presets Layout
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

      // ===== INITIALISATION =====
      initializeForModal: (selectedItems, productsData, activeFilters, entityNamePlural) => {
        set({
          selectedItems,
          productsData,
          activeFilters,
          entityNamePlural,
          loading: false,
          enableCellSelection: false,
          disabledCells: new Set(),
        });

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
      partialize: (state) => ({
        labelStyle: {
          ...state.labelStyle,
          duplicateCount: 1, // Toujours reset à 1
        },
        currentLayout: state.currentLayout,
      }),
    }
  )
);

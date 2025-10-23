// useLabelExportStore.js - VERSION AVEC COULEURS
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import userPresetService from '../../../../../../../../services/userPresetService';
import { calculateGridDimensions, generateExportTitle } from '../utils/labelUtils';

const DEFAULT_STYLE = {
  fontSize: 12,
  fontFamily: 'Arial',
  showBorder: false,
  borderWidth: 0.1,
  borderColor: '#000000',
  alignment: 'center',
  showBarcode: true,
  barcodeHeight: 15,
  barcodeType: 'barcode',
  qrCodeSize: 8,
  barcodeWidth: 60,
  showBarcodeText: true,
  barcodeTextSize: 8,
  showPrice: true,
  priceSize: 14,
  priceWeight: 'bold',
  showName: false,
  nameSize: 10,
  priceFontFamily: 'Arial',
  nameFontFamily: 'Arial',
  nameWeight: 'bold',
  duplicateCount: 1,
  showWooQR: false,
  showWooQRText: true,
  wooQRTextSize: 7,
  wooQRText: 'Voir en ligne',
  wooQRSize: 10,
  customPositions: {},
  showSku: false,
  showBrand: false,
  showSupplier: false,
  skuSize: 10,
  brandSize: 10,
  supplierSize: 10,
  skuWeight: 'normal',
  brandWeight: 'normal',
  supplierWeight: 'normal',
  skuFontFamily: 'Arial',
  brandFontFamily: 'Arial',
  supplierFontFamily: 'Arial',
  customTexts: [],

  // 🎨 NOUVEAU : Couleurs personnalisées
  colors: {
    name: '#000000',
    price: '#000000',
    barcode: '#000000',
    barcodeText: '#000000',
    wooQR: '#000000',
    wooQRText: '#000000',
    border: '#000000',
    sku: '#000000',
    brand: '#000000',
    supplier: '#000000',
  },

  customImages: [],
};

// 🆕 BLANK_STYLE - Étiquette complètement vierge (TOUT désactivé)
const BLANK_STYLE = {
  fontSize: 12,
  fontFamily: 'Arial',
  showBorder: false, // ❌ Pas de bordure
  borderWidth: 0.1,
  borderColor: '#000000',
  alignment: 'center',
  showBarcode: false, // ❌ Pas de code-barres
  barcodeHeight: 15,
  barcodeType: 'barcode',
  qrCodeSize: 8,
  barcodeWidth: 60,
  showBarcodeText: false, // ❌ Pas de texte code-barres
  barcodeTextSize: 8,
  showPrice: false, // ❌ Pas de prix
  priceSize: 14,
  priceWeight: 'bold',
  showName: false, // ❌ Pas de nom
  nameSize: 10,
  priceFontFamily: 'Arial',
  nameFontFamily: 'Arial',
  nameWeight: 'bold',
  duplicateCount: 1,
  showWooQR: false, // ❌ Pas de QR WooCommerce
  showWooQRText: false,
  wooQRTextSize: 7,
  wooQRText: 'Voir en ligne',
  wooQRSize: 10,
  customPositions: {},
  showSku: false, // ❌ Pas de SKU
  showBrand: false, // ❌ Pas de marque
  showSupplier: false, // ❌ Pas de fournisseur
  skuSize: 10,
  brandSize: 10,
  supplierSize: 10,
  skuWeight: 'normal',
  brandWeight: 'normal',
  supplierWeight: 'normal',
  skuFontFamily: 'Arial',
  brandFontFamily: 'Arial',
  supplierFontFamily: 'Arial',
  customTexts: [], // ❌ Pas de textes personnalisés
  colors: {
    name: '#000000',
    price: '#000000',
    barcode: '#000000',
    barcodeText: '#000000',
    wooQR: '#000000',
    wooQRText: '#000000',
    border: '#000000',
    sku: '#000000',
    brand: '#000000',
    supplier: '#000000',
  },
  customImages: [], // ❌ Pas d'images personnalisées
};

const DEFAULT_LAYOUTS = {
  A4: {
    width: 48.5,
    height: 25,
    offsetTop: 22,
    offsetLeft: 8,
    spacingV: 0,
    spacingH: 0,
    supportType: 'A4',
  },
  rouleau: {
    width: 29,
    height: 15,
    offsetTop: 0,
    offsetLeft: 0,
    spacingV: 0,
    spacingH: 0,
    supportType: 'rouleau',
    rouleau: { width: 29 },
    padding: 1,
  },
  custom: {
    width: 50,
    height: 25,
    offsetTop: 10,
    offsetLeft: 10,
    spacingV: 0,
    spacingH: 0,
    supportType: 'custom',
  },
};

const SUPPORT_TYPES = [
  {
    id: 'A4',
    name: 'A4 (210×297mm)',
    description: 'Feuille A4 standard',
    defaults: DEFAULT_LAYOUTS.A4,
  },
  {
    id: 'rouleau',
    name: "Rouleau d'étiquettes",
    description: 'Support rouleau (coupe automatique)',
    defaults: DEFAULT_LAYOUTS.rouleau,
  },
  {
    id: 'custom',
    name: 'Format personnalisé',
    description: 'Dimensions sur mesure',
    defaults: DEFAULT_LAYOUTS.custom,
  },
];

export const useLabelExportStore = create(
  persist(
    (set, get) => ({
      // ===== ÉTAT PRINCIPAL =====
      labelStyle: DEFAULT_STYLE,
      currentLayout: DEFAULT_LAYOUTS.rouleau,
      exportTitle: '',

      // États volatiles (jamais persistés)
      loading: false,
      enableCellSelection: false,
      disabledCells: new Set(),
      savedPresets: [],
      selectedItems: [],
      productsData: [],
      activeFilters: [],
      entityNamePlural: '',
      availablePrinters: [],
      selectedPrinter: null,
      printing: false,
      printError: null,
      availableImages: [],
      loadingImages: false,

      // ===== API UNIFIÉE =====

      // 🎯 STYLE - Une seule méthode
      updateStyle: (changes) =>
        set((state) => ({
          labelStyle: { ...state.labelStyle, ...changes },
        })),

      // 🎨 NOUVEAU : Méthode dédiée aux couleurs
      updateColor: (element, color) =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            colors: {
              ...state.labelStyle.colors,
              [element]: color,
            },
          },
        })),

      // 🆕 Gestion des textes personnalisés
      updateCustomText: (textId, changes) =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customTexts: state.labelStyle.customTexts.map((text) =>
              text.id === textId ? { ...text, ...changes } : text
            ),
          },
        })),

      addCustomText: () =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customTexts: [
              ...state.labelStyle.customTexts,
              {
                id: `text_${Date.now()}`,
                enabled: true,
                content: 'Nouveau texte',
                fontSize: 10,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                color: '#000000',
                position: null, // Position par défaut calculée
              },
            ],
          },
        })),

      removeCustomText: (textId) =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customTexts: state.labelStyle.customTexts.filter((text) => text.id !== textId),
            customPositions: Object.fromEntries(
              Object.entries(state.labelStyle.customPositions).filter(([key]) => key !== textId)
            ),
          },
        })),

      duplicateCustomText: (textId) =>
        set((state) => {
          const textToDuplicate = state.labelStyle.customTexts.find((t) => t.id === textId);
          if (!textToDuplicate) return {};

          return {
            labelStyle: {
              ...state.labelStyle,
              customTexts: [
                ...state.labelStyle.customTexts,
                {
                  ...textToDuplicate,
                  id: `text_${Date.now()}`,
                  content: `${textToDuplicate.content} (copie)`,
                  position: null,
                },
              ],
            },
          };
        }),

      // 🎯 LAYOUT - Une seule méthode
      updateLayout: (field, value) =>
        set((state) => {
          const updated = { ...state.currentLayout };

          // 🆕 Détection du changement de dimensions critiques
          const isDimensionChange =
            field === 'width' ||
            field === 'height' ||
            (field.includes('.') && (field.includes('width') || field.includes('height')));

          if (field.includes('.')) {
            const [parent, child] = field.split('.');
            updated[parent] = { ...updated[parent], [child]: parseFloat(value) || 0 };
          } else {
            updated[field] = parseFloat(value) || 0;
          }

          // ✅ CORRECTION : Réinitialiser les positions si dimensions changées
          if (isDimensionChange) {
            console.log('🔄 Dimensions modifiées, réinitialisation des positions personnalisées');
            return {
              currentLayout: updated,
              labelStyle: {
                ...state.labelStyle,
                customPositions: {}, // Réinitialiser toutes les positions
              },
            };
          }

          return { currentLayout: updated };
        }),

      // 🎯 SUPPORT TYPE
      changeSupportType: (type) => {
        console.log('🔄 Changement de support, réinitialisation des positions');
        set({
          currentLayout: { ...(DEFAULT_LAYOUTS[type] || DEFAULT_LAYOUTS.rouleau) },
          labelStyle: {
            ...get().labelStyle,
            customPositions: {}, // ✅ Réinitialiser les positions
          },
        });
        get().managePresets('load');
      },

      // 🖼️ Charger la bibliothèque d'images
      loadAvailableImages: async () => {
        set({ loadingImages: true });
        try {
          const presetImageService = (await import('@services/presetImageService')).default;
          const images = await presetImageService.listImages();
          set({ availableImages: images });
        } catch (error) {
          console.error('❌ Erreur chargement images:', error);
        } finally {
          set({ loadingImages: false });
        }
      },

      // ➕ Ajouter une image au preset
      addCustomImage: (imageData) =>
        set((state) => {
          // Vérifier que ce n'est pas en mode rouleau
          if (state.currentLayout.supportType === 'rouleau') {
            console.warn('⚠️ Images non disponibles en mode rouleau');
            return {};
          }

          // 🛡️ S'assurer que customImages existe (rétrocompatibilité)
          const existingImages = state.labelStyle.customImages || [];

          return {
            labelStyle: {
              ...state.labelStyle,
              customImages: [
                ...existingImages,
                {
                  id: `img_${Date.now()}`,
                  src: imageData.src,
                  filename: imageData.filename,
                  width: imageData.width || 50, // mm
                  height: imageData.height || 50, // mm
                  opacity: 1,
                  rotation: 0,
                  position: null, // Sera calculée automatiquement
                },
              ],
            },
          };
        }),

      // 🔄 Mettre à jour une image (CORRIGÉ)
      updateCustomImage: (imageId, changes) =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customImages: (state.labelStyle.customImages || []).map((img) =>
              img.id === imageId ? { ...img, ...changes } : img
            ),
          },
        })),

      // 🗑️ Supprimer une image du preset (CORRIGÉ)
      removeCustomImage: (imageId) =>
        set((state) => ({
          labelStyle: {
            ...state.labelStyle,
            customImages: (state.labelStyle.customImages || []).filter((img) => img.id !== imageId),
            customPositions: Object.fromEntries(
              Object.entries(state.labelStyle.customPositions || {}).filter(
                ([key]) => key !== imageId
              )
            ),
          },
        })),

      // 📋 Dupliquer une image (CORRIGÉ)
      duplicateCustomImage: (imageId) =>
        set((state) => {
          const imageToDuplicate = (state.labelStyle.customImages || []).find(
            (img) => img.id === imageId
          );
          if (!imageToDuplicate) return {};

          return {
            labelStyle: {
              ...state.labelStyle,
              customImages: [
                ...(state.labelStyle.customImages || []),
                {
                  ...imageToDuplicate,
                  id: `img_${Date.now()}`,
                  position: null, // Nouvelle position
                },
              ],
            },
          };
        }),

      // 🎯 RESET UNIFIÉ
      reset: (scope = 'all') =>
        set((state) => {
          const updates = {};

          // 🆕 BLANK - Étiquette complètement vierge (TOUS les éléments désactivés)
          if (scope === 'blank') {
            updates.labelStyle = {
              ...BLANK_STYLE,
              duplicateCount: 1,
              customPositions: {},
              customTexts: [],
              customImages: [],
            };
            updates.currentLayout =
              DEFAULT_LAYOUTS[state.currentLayout.supportType] || DEFAULT_LAYOUTS.A4;
            updates.enableCellSelection = false;
            updates.disabledCells = new Set();
            return updates;
          }

          if (scope === 'all' || scope === 'style') {
            updates.labelStyle = {
              ...DEFAULT_STYLE,
              duplicateCount: 1,
              customPositions: state.labelStyle.customPositions || {},
              customTexts: [],
              customImages: [],
            };
          }
          if (scope === 'all' || scope === 'layout') {
            updates.currentLayout =
              DEFAULT_LAYOUTS[state.currentLayout.supportType] || DEFAULT_LAYOUTS.A4;
          }
          if (scope === 'all' || scope === 'cells') {
            updates.enableCellSelection = false;
            updates.disabledCells = new Set();
          }
          if (scope === 'all' || scope === 'print') {
            updates.printing = false;
            updates.printError = null;
          }
          if (scope === 'all' || scope === 'positions') {
            updates.labelStyle = { ...state.labelStyle, customPositions: {} };
          }
          if (scope === 'all' || scope === 'colors') {
            updates.labelStyle = { ...state.labelStyle, colors: DEFAULT_STYLE.colors };
          }

          if (scope === 'all' || scope === 'images') {
            updates.labelStyle = { ...state.labelStyle, customImages: [] };
          }

          return updates;
        }),

      // 🎯 CELLULES
      toggleCells: (action, cellIndex = null) =>
        set((state) => {
          switch (action) {
            case 'enable':
              return { enableCellSelection: true };
            case 'disable':
              return { enableCellSelection: false, disabledCells: new Set() };
            case 'toggle':
              if (cellIndex !== null) {
                const newDisabled = new Set(state.disabledCells);
                newDisabled.has(cellIndex)
                  ? newDisabled.delete(cellIndex)
                  : newDisabled.add(cellIndex);
                return { disabledCells: newDisabled };
              }
              break;
            case 'clear':
              return { disabledCells: new Set() };
            case 'selectAll':
              const total = calculateGridDimensions(state.currentLayout).total;
              return { disabledCells: new Set(Array.from({ length: total }, (_, i) => i)) };
          }
          return {};
        }),

      // 🎯 PRESETS
      managePresets: async (action, data = {}) => {
        const category = 'label_preset';

        try {
          switch (action) {
            case 'load':
              const allPresets = await userPresetService.getAllPresets(category);
              const currentSupportType = get().currentLayout.supportType;
              const filteredPresets = allPresets.filter((preset) => {
                if (!preset.preset_data?.layout) return false;
                return preset.preset_data.layout.supportType === currentSupportType;
              });
              set({ savedPresets: filteredPresets });
              break;

            case 'save':
              const content = {
                layout: get().currentLayout,
                style: get().labelStyle,
              };
              await userPresetService.savePreset(
                category,
                data.name,
                content,
                data.isPublic || false
              );
              get().managePresets('load');
              return true;

            case 'apply':
              const preset = get().savedPresets.find((p) => p._id === data.id);
              if (preset?.preset_data) {
                set({
                  currentLayout: { ...DEFAULT_LAYOUTS.A4, ...preset.preset_data.layout },
                  labelStyle: { ...DEFAULT_STYLE, ...preset.preset_data.style },
                });
                return true;
              }
              break;

            case 'delete':
              const presetToDelete = get().savedPresets.find((p) => p._id === data.id);
              if (!presetToDelete) return false;
              if (presetToDelete.is_factory) {
                console.warn("Impossible de supprimer un preset d'usine");
                return false;
              }

              // Appeler la méthode de suppression avec le flag isPublic
              await userPresetService.deletePreset(category, data.id, data.isPublic || false);
              await get().managePresets('load');
              return true;
          }
        } catch (error) {
          console.error('❌ Store - Erreur managePresets:', { action, data, error });
          return false;
        }
      },

      // 🎯 IMPRESSION
      print: async (action, data = {}) => {
        switch (action) {
          case 'loadPrinters':
            set({ printError: null });
            try {
              const RollLabelRenderer = (await import('../services/RollLabelRenderer')).default;
              const printers = await RollLabelRenderer.getAvailablePrinters();
              set({
                availablePrinters: printers,
                selectedPrinter: printers.find((p) => p.Default) || printers[0] || null,
              });
            } catch (error) {
              set({ printError: error.message });
            }
            break;

          case 'selectPrinter':
            set({ selectedPrinter: data.printer });
            break;

          case 'direct':
            const { selectedItems, currentLayout, selectedPrinter } = get();
            if (!selectedItems.length) throw new Error('Aucune sélection');
            if (currentLayout.supportType !== 'rouleau') throw new Error('Mode rouleau requis');

            set({ printing: true, printError: null });
            try {
              const RollLabelRenderer = (await import('../services/RollLabelRenderer')).default;
              const result = await RollLabelRenderer.printLabelsDirectly({
                labelData: get().extractLabelData(),
                labelLayout: get().buildLabelLayout(),
                printerName: selectedPrinter?.Name,
                copies: 1,
              });
              return result;
            } catch (error) {
              set({ printError: error.message });
              throw error;
            } finally {
              set({ printing: false });
            }
        }
      },

      // ===== UTILITAIRES =====
      getSupportTypes: () => SUPPORT_TYPES,
      getGridDimensions: () => calculateGridDimensions(get().currentLayout),
      getCellStats: () => {
        const { disabledCells, currentLayout } = get();
        const total = calculateGridDimensions(currentLayout).total;
        return { total, active: total - disabledCells.size, disabled: disabledCells.size };
      },

      extractLabelData: () => {
        const { selectedItems, productsData } = get();
        return selectedItems
          .map((id) => productsData.find((p) => p._id === id))
          .filter(Boolean)
          .map((product) => ({
            id: product._id,
            name: product.name || product.designation || product.sku,
            price: product.price || 0,
            barcode: product.meta_data?.find((m) => m.key === 'barcode')?.value || '',
            sku: product.sku || '',
            designation: product.designation || '',
            websiteUrl: product.website_url || '',
            brand: product.brand_ref?.name || '',
            supplier: product.supplier_ref?.name || '',
          }));
      },

      buildLabelLayout: () => ({
        layout: get().currentLayout,
        style: get().labelStyle,
        disabledCells: Array.from(get().disabledCells),
      }),

      // ===== INITIALISATION =====
      initialize: (selectedItems, productsData, activeFilters, entityNamePlural) => {
        set({
          selectedItems,
          productsData,
          activeFilters,
          entityNamePlural,
          exportTitle: generateExportTitle(activeFilters, entityNamePlural),
          loading: false,
          enableCellSelection: false,
          disabledCells: new Set(),
          labelStyle: { ...get().labelStyle, duplicateCount: 1 },
        });

        get().managePresets('load', 'style');
        get().managePresets('load', 'layout');
      },

      setExportTitle: (title) => set({ exportTitle: title }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'label-export-config',
      partialize: (state) => ({
        labelStyle: state.labelStyle,
        currentLayout: state.currentLayout,
        selectedPrinter: state.selectedPrinter,
      }),
    }
  )
);

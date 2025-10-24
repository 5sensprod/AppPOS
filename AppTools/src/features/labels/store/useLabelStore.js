// src/features/labels/store/useLabelStore.js
import { create } from 'zustand';

const useLabelStore = create((set) => ({
  elements: [],
  selectedId: null,
  dataSource: null,
  selectedProduct: null,
  selectedProducts: [],
  zoom: 1,
  canvasSize: { width: 800, height: 600 },

  addElement: (element) =>
    set((state) => ({
      elements: [
        ...state.elements,
        { ...element, id: `el-${Date.now()}`, visible: true, locked: false },
      ],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  duplicateElement: (id) =>
    set((state) => {
      const element = state.elements.find((el) => el.id === id);
      if (!element) return state;

      const newElement = {
        ...element,
        id: `el-${Date.now()}`,
        x: element.x + 20,
        y: element.y + 20,
      };

      return {
        elements: [...state.elements, newElement],
        selectedId: newElement.id,
      };
    }),

  moveElement: (fromIndex, toIndex) =>
    set((state) => {
      const newElements = [...state.elements];
      const [moved] = newElements.splice(fromIndex, 1);
      newElements.splice(toIndex, 0, moved);
      return { elements: newElements };
    }),

  selectElement: (id) => set({ selectedId: id }),

  clearSelection: () => set({ selectedId: null }),

  // Gère automatiquement la sélection simple ou multiple de produits
  setDataSource: (source, product = null) =>
    set(() => {
      // Mode multi-produits : product est un tableau
      if (Array.isArray(product)) {
        return {
          dataSource: source,
          selectedProducts: product,
          selectedProduct: product.length > 0 ? product[0] : null,
        };
      }

      // Mode simple : product est un objet
      if (product && typeof product === 'object') {
        return {
          dataSource: source,
          selectedProducts: [product],
          selectedProduct: product,
        };
      }

      // Mode vide : aucun produit
      return {
        dataSource: source,
        selectedProducts: [],
        selectedProduct: null,
      };
    }),

  setSelectedProducts: (products) =>
    set({
      selectedProducts: Array.isArray(products) ? products : [],
      selectedProduct: Array.isArray(products) && products.length > 0 ? products[0] : null,
    }),

  clearCanvas: () =>
    set({
      elements: [],
      selectedId: null,
      selectedProducts: [],
      selectedProduct: null,
    }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.1) })),

  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom - 0.1) })),

  resetZoom: () => set({ zoom: 1 }),

  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),
}));

export default useLabelStore;

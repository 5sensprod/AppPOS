// src/features/labels/store/useLabelStore.js
import { create } from 'zustand';

const HISTORY_LIMIT = 100;

// 👉 Ce qu'on versionne dans l'historique (léger & suffisant pour Undo/Redo UI)
const snapshotOf = (state) => ({
  elements: state.elements,
  selectedId: state.selectedId,
});

const useLabelStore = create((set, get) => ({
  // --- état principal
  elements: [],
  selectedId: null,
  dataSource: null,
  selectedProduct: null,
  selectedProducts: [],
  zoom: 1,
  canvasSize: { width: 800, height: 600 },

  // --- verrou : le canvas suit la taille d'une cellule de planche
  lockCanvasToSheetCell: false,

  // --- historique
  historyPast: [],
  historyFuture: [],
  canUndo: false,
  canRedo: false,

  // --- helpers historique
  _pushHistory(prev) {
    const past = get().historyPast;
    const nextPast = [...past, prev].slice(-HISTORY_LIMIT);
    set({
      historyPast: nextPast,
      historyFuture: [],
      canUndo: nextPast.length > 0,
      canRedo: false,
    });
  },

  _afterUndoRedo({ elements, selectedId, historyPast, historyFuture }) {
    set({
      elements,
      selectedId,
      historyPast,
      historyFuture,
      canUndo: historyPast.length > 0,
      canRedo: historyFuture.length > 0,
    });
  },

  // --- actions d'historique
  undo() {
    const state = get();
    if (state.historyPast.length === 0) return;

    const prev = state.historyPast[state.historyPast.length - 1];
    const newPast = state.historyPast.slice(0, -1);
    const current = snapshotOf(state);
    const newFuture = [...state.historyFuture, current].slice(-HISTORY_LIMIT);

    state._afterUndoRedo({
      elements: prev.elements,
      selectedId: prev.selectedId,
      historyPast: newPast,
      historyFuture: newFuture,
    });
  },

  redo() {
    const state = get();
    if (state.historyFuture.length === 0) return;

    const next = state.historyFuture[state.historyFuture.length - 1];
    const newFuture = state.historyFuture.slice(0, -1);
    const current = snapshotOf(state);
    const newPast = [...state.historyPast, current].slice(-HISTORY_LIMIT);

    state._afterUndoRedo({
      elements: next.elements,
      selectedId: next.selectedId,
      historyPast: newPast,
      historyFuture: newFuture,
    });
  },

  // --- mutations (poussent dans l'historique)
  addElement: (element) =>
    set((state) => {
      state._pushHistory(snapshotOf(state));
      return {
        elements: [
          ...state.elements,
          { ...element, id: `el-${Date.now()}`, visible: true, locked: false },
        ],
      };
    }),

  updateElement: (id, updates) =>
    set((state) => {
      state._pushHistory(snapshotOf(state));
      return {
        elements: state.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
      };
    }),

  deleteElement: (id) =>
    set((state) => {
      state._pushHistory(snapshotOf(state));
      return {
        elements: state.elements.filter((el) => el.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      };
    }),

  duplicateElement: (id) =>
    set((state) => {
      const element = state.elements.find((el) => el.id === id);
      if (!element) return state;
      state._pushHistory(snapshotOf(state));

      const newElement = {
        ...element,
        id: `el-${Date.now()}`,
        x: (element.x || 0) + 20,
        y: (element.y || 0) + 20,
      };

      return {
        elements: [...state.elements, newElement],
        selectedId: newElement.id,
      };
    }),

  moveElement: (fromIndex, toIndex) =>
    set((state) => {
      state._pushHistory(snapshotOf(state));
      const newElements = [...state.elements];
      const [moved] = newElements.splice(fromIndex, 1);
      newElements.splice(toIndex, 0, moved);
      return { elements: newElements };
    }),

  // --- sélection
  selectElement: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),

  // --- data (ne pollue pas l'historique des éléments)
  setDataSource: (source, product = null) =>
    set((state) => {
      if (Array.isArray(product)) {
        return {
          dataSource: source,
          selectedProducts: product,
          selectedProduct: product.length > 0 ? product[0] : null,
        };
      }
      if (product && typeof product === 'object') {
        return {
          dataSource: source,
          selectedProducts: [product],
          selectedProduct: product,
        };
      }
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
    set((state) => {
      state._pushHistory(snapshotOf(state));
      return {
        elements: [],
        selectedId: null,
        selectedProducts: [],
        selectedProduct: null,
      };
    }),

  // --- zoom & canvas
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.1) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom - 0.1) })),
  resetZoom: () => set({ zoom: 1 }),

  // NB: changer la taille du canvas ne touche pas l'historique des éléments
  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),

  // --- verrou “canvas = taille de cellule”
  setLockCanvasToSheetCell: (lock) => set({ lockCanvasToSheetCell: !!lock }),
}));

export default useLabelStore;

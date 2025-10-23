// src/features/labels/store/useLabelStore.js
import { create } from 'zustand';

const useLabelStore = create((set) => ({
  elements: [],
  selectedId: null,
  dataSource: null,
  selectedProduct: null,
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

  setDataSource: (source, product = null) => set({ dataSource: source, selectedProduct: product }),

  clearCanvas: () => set({ elements: [], selectedId: null }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),

  zoomIn: () => set((state) => ({ zoom: Math.min(3, state.zoom + 0.1) })),

  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom - 0.1) })),

  resetZoom: () => set({ zoom: 1 }),

  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),
}));

export default useLabelStore;

import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info', // 'success', 'error', 'warning', 'info', 'progress'
      title: '',
      message: '',
      duration: 4000,
      dismissible: true,
      progress: null, // Pour les toasts de progression
      ...toast,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss si une durée est définie
    if (newToast.duration > 0 && newToast.type !== 'progress') {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)),
    }));
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },

  // Méthodes de convenance
  success: (message, options = {}) => {
    return get().addToast({
      type: 'success',
      message,
      duration: 3000,
      ...options,
    });
  },

  error: (message, options = {}) => {
    return get().addToast({
      type: 'error',
      message,
      duration: 6000,
      ...options,
    });
  },

  warning: (message, options = {}) => {
    return get().addToast({
      type: 'warning',
      message,
      duration: 4000,
      ...options,
    });
  },

  info: (message, options = {}) => {
    return get().addToast({
      type: 'info',
      message,
      duration: 4000,
      ...options,
    });
  },

  progress: (message, options = {}) => {
    return get().addToast({
      type: 'progress',
      message,
      duration: 0, // Pas de disparition automatique
      dismissible: false,
      progress: { current: 0, total: 100 },
      ...options,
    });
  },
}));

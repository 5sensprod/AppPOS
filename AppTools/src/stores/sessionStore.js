// src/stores/sessionStore.js - ZUSTAND UNIFIÉ POUR TOUTES LES SESSIONS
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import cashierSessionService from '../services/cashierSessionService';

// ✅ STORE UNIFIÉ AVEC ZUSTAND
export const useSessionStore = create(
  subscribeWithSelector((set, get) => ({
    // ✅ ÉTATS AUTH (délégués ou dupliqués depuis AuthContext)
    user: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,

    // ✅ ÉTATS SESSION CAISSE
    cashierSession: null,
    sessionLoading: false,
    sessionError: null,

    // ✅ ÉTATS LCD
    lcdStatus: null,
    lcdPorts: [],
    lcdLoading: false,
    lcdError: null,

    // ✅ SYNCHRONISATION CENTRALE
    syncSessionState: async () => {
      const state = get();
      if (!state.isAuthenticated || !state.user) return;

      try {
        const response = await cashierSessionService.getSessionStatus();
        const data = response.data;

        // ✅ MISE À JOUR ATOMIQUE
        set((state) => ({
          ...state,
          cashierSession: data.session,
          lcdStatus: data.lcd_status,
          // Clear erreurs si tout OK
          sessionError: data.session ? null : state.sessionError,
          lcdError: data.can_use_lcd ? null : state.lcdError,
        }));

        console.log('🔄 [SESSION STORE] État synchronisé', {
          hasSession: !!data.session,
          hasLCD: data.can_use_lcd,
        });
      } catch (error) {
        if (!error.message.includes('Aucune session')) {
          set((state) => ({
            ...state,
            sessionError: error.message,
          }));
        }
      }
    },

    // ✅ ACTIONS SESSION CAISSE
    startSession: async (lcdPort = null, lcdConfig = {}) => {
      const state = get();
      if (!state.isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      set((state) => ({
        ...state,
        sessionLoading: true,
        sessionError: null,
        lcdError: null,
      }));

      try {
        const response = await cashierSessionService.openSession(lcdPort, lcdConfig);
        const data = response.data;

        // ✅ MISE À JOUR IMMÉDIATE
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: data.session,
          lcdStatus: data.lcd_status,
        }));

        // ✅ SYNC CONFIRMÉE
        setTimeout(() => {
          get().syncSessionState();
        }, 500);

        console.log('✅ [SESSION STORE] Session démarrée', data);
        return data;
      } catch (error) {
        const message = error.response?.data?.message || error.message;

        set((state) => ({
          ...state,
          sessionLoading: false,
          ...(message.includes('LCD') ? { lcdError: message } : { sessionError: message }),
        }));

        throw error;
      }
    },

    stopSession: async () => {
      set((state) => ({
        ...state,
        sessionLoading: true,
        sessionError: null,
      }));

      try {
        const response = await cashierSessionService.closeSession();

        // ✅ RESET IMMÉDIAT
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: null,
          lcdStatus: null,
          lcdError: null,
        }));

        setTimeout(() => {
          get().syncSessionState();
        }, 500);

        console.log('🛑 [SESSION STORE] Session fermée');
        return response.data;
      } catch (error) {
        set((state) => ({
          ...state,
          sessionLoading: false,
          sessionError: error.response?.data?.message || error.message,
        }));
        throw error;
      }
    },

    // ✅ ACTIONS LCD
    requestLCD: async (port, config = {}) => {
      set((state) => ({ ...state, lcdLoading: true, lcdError: null }));

      try {
        const response = await cashierSessionService.requestLCDControl(port, config);

        set((state) => ({
          ...state,
          lcdLoading: false,
          lcdStatus: response.data.lcd_status,
        }));

        setTimeout(() => get().syncSessionState(), 500);
        return response.data;
      } catch (error) {
        set((state) => ({
          ...state,
          lcdLoading: false,
          lcdError: error.response?.data?.message || error.message,
        }));
        throw error;
      }
    },

    releaseLCD: async () => {
      set((state) => ({ ...state, lcdLoading: true, lcdError: null }));

      try {
        const response = await cashierSessionService.releaseLCDControl();

        set((state) => ({
          ...state,
          lcdLoading: false,
          lcdStatus: response.data.lcd_status,
        }));

        setTimeout(() => get().syncSessionState(), 500);
        return response.data;
      } catch (error) {
        set((state) => ({
          ...state,
          lcdLoading: false,
          lcdError: error.response?.data?.message || error.message,
        }));
        throw error;
      }
    },

    loadLCDPorts: async () => {
      try {
        const response = await cashierSessionService.listLCDPorts();

        set((state) => ({
          ...state,
          lcdPorts: response.data.available_ports || [],
        }));

        return response.data;
      } catch (error) {
        set((state) => ({
          ...state,
          lcdError: error.message,
        }));
        throw error;
      }
    },

    // ✅ OPÉRATIONS LCD AVEC GESTION D'ERREUR
    safeLCDOperation: async (operation) => {
      try {
        const result = await operation();

        // Clear erreur LCD si succès
        set((state) => ({
          ...state,
          lcdError: null,
        }));

        return result;
      } catch (error) {
        const message = error.response?.data?.message || error.message;

        set((state) => ({
          ...state,
          lcdError: message,
        }));

        // Sync si erreur de session
        if (message.includes('non assigné') || message.includes('session')) {
          get().syncSessionState();
        }

        throw error;
      }
    },

    // ✅ MÉTHODES LCD RACCOURCIES
    lcd: {
      showPrice: async (itemName, price) => {
        return get().safeLCDOperation(() => cashierSessionService.showLCDPrice(itemName, price));
      },

      showTotal: async (total) => {
        return get().safeLCDOperation(() => cashierSessionService.showLCDTotal(total));
      },

      showWelcome: async () => {
        return get().safeLCDOperation(() => cashierSessionService.showLCDWelcome());
      },

      showThankYou: async () => {
        return get().safeLCDOperation(() => cashierSessionService.showLCDThankYou());
      },

      writeMessage: async (line1, line2) => {
        return get().safeLCDOperation(() => cashierSessionService.writeLCDMessage(line1, line2));
      },

      clearDisplay: async () => {
        return get().safeLCDOperation(() => cashierSessionService.clearLCDDisplay());
      },
    },

    // ✅ SETTERS UTILITAIRES
    setUser: (user) => set((state) => ({ ...state, user, isAuthenticated: !!user })),
    setSessionError: (error) => set((state) => ({ ...state, sessionError: error })),
    setLcdError: (error) => set((state) => ({ ...state, lcdError: error })),
    clearErrors: () =>
      set((state) => ({
        ...state,
        sessionError: null,
        lcdError: null,
        authError: null,
      })),

    // ✅ RESET COMPLET
    reset: () =>
      set(() => ({
        user: null,
        isAuthenticated: false,
        authLoading: false,
        authError: null,
        cashierSession: null,
        sessionLoading: false,
        sessionError: null,
        lcdStatus: null,
        lcdPorts: [],
        lcdLoading: false,
        lcdError: null,
      })),
  }))
);

// ✅ HOOKS SÉLECTEURS STABLES POUR OPTIMISER LES RE-RENDERS
export const useSessionAuth = () => {
  const user = useSessionStore((state) => state.user);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const authLoading = useSessionStore((state) => state.authLoading);
  const authError = useSessionStore((state) => state.authError);

  return { user, isAuthenticated, authLoading, authError };
};

export const useSessionCashier = () => {
  const cashierSession = useSessionStore((state) => state.cashierSession);
  const sessionLoading = useSessionStore((state) => state.sessionLoading);
  const sessionError = useSessionStore((state) => state.sessionError);
  const startSession = useSessionStore((state) => state.startSession);
  const stopSession = useSessionStore((state) => state.stopSession);

  // ✅ CALCULÉ DE MANIÈRE STABLE
  const hasActiveCashierSession = Boolean(cashierSession?.status === 'active');

  return {
    cashierSession,
    hasActiveCashierSession,
    sessionLoading,
    sessionError,
    startSession,
    stopSession,
  };
};

export const useSessionLCD = () => {
  const lcdStatus = useSessionStore((state) => state.lcdStatus);
  const lcdPorts = useSessionStore((state) => state.lcdPorts);
  const lcdLoading = useSessionStore((state) => state.lcdLoading);
  const lcdError = useSessionStore((state) => state.lcdError);
  const requestLCD = useSessionStore((state) => state.requestLCD);
  const releaseLCD = useSessionStore((state) => state.releaseLCD);
  const loadLCDPorts = useSessionStore((state) => state.loadLCDPorts);
  const lcd = useSessionStore((state) => state.lcd);
  const user = useSessionStore((state) => state.user);
  const cashierSession = useSessionStore((state) => state.cashierSession);

  // ✅ CALCULÉS DE MANIÈRE STABLE
  const hasLCDControl = Boolean(lcdStatus?.owned && lcdStatus?.owner?.cashier_id === user?.id);
  const canUseLCD = Boolean(cashierSession?.status === 'active' && hasLCDControl);

  return {
    lcdStatus,
    lcdPorts,
    hasLCDControl,
    canUseLCD,
    lcdLoading,
    lcdError,
    requestLCD,
    releaseLCD,
    loadLCDPorts,
    lcd,
  };
};

// ✅ USAGE DANS LES COMPOSANTS
/*

// Sélection fine pour éviter re-renders inutiles
const SessionManager = () => {
  const { hasActiveCashierSession, startSession, stopSession } = useSessionCashier();
  const { canUseLCD, requestLCD, releaseLCD } = useSessionLCD();
  
  // Seulement re-render si ces valeurs changent
};

const CashierPage = () => {
  const { isFullyReady } = useSessionStore((state) => ({ 
    isFullyReady: state.isFullyReady() 
  }));
  const { lcd } = useSessionLCD();
  
  // Optimal: seulement les changements pertinents
};

*/

// src/stores/sessionStore.js - ZUSTAND UNIFIÉ AVEC WEBSOCKET (SANS POLLING)
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

    // ✅ ÉTAT WEBSOCKET
    wsListenersInitialized: false,

    // ✅ NOUVELLE : SYNCHRONISATION INITIALE UNIQUEMENT (PLUS DE POLLING)
    syncInitialState: async () => {
      const state = get();
      if (!state.isAuthenticated || !state.user) return;

      console.log("🔄 [SESSION STORE] Synchronisation initiale de l'état");

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

        console.log('✅ [SESSION STORE] État initial synchronisé', {
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

    // ✅ NOUVELLE : INITIALISATION DES LISTENERS WEBSOCKET
    initWebSocketListeners: async () => {
      const state = get();

      if (state.wsListenersInitialized) {
        console.log('⏭️ [SESSION STORE] Listeners WebSocket déjà initialisés');
        return;
      }

      if (!state.isAuthenticated || !state.user) {
        console.log(
          '⚠️ [SESSION STORE] Utilisateur non authentifié, listeners WebSocket non initialisés'
        );
        return;
      }

      try {
        const websocketModule = await import('../services/websocketService');
        const websocketService = websocketModule.default;

        if (!websocketService) {
          console.error('[SESSION STORE] Service WebSocket non trouvé');
          return;
        }

        const userId = state.user.id;
        console.log(`🔔 [SESSION STORE] Initialisation listeners WebSocket pour user ${userId}`);

        // ✅ LISTENER : CHANGEMENT STATUS SESSION
        const handleSessionStatusChanged = (payload) => {
          console.log('📊 [SESSION STORE] Session status changé reçu:', payload);

          // Filtrer par utilisateur connecté
          if (payload.cashier_id === userId) {
            console.log(
              `🔄 [SESSION STORE] Session ${payload.session.status} pour utilisateur connecté`
            );

            set((state) => ({
              ...state,
              cashierSession:
                payload.session.status === 'closed'
                  ? null
                  : {
                      cashier_id: payload.cashier_id,
                      username: payload.username,
                      status: payload.session.status,
                      startTime: payload.session.startTime,
                      endTime: payload.session.endTime,
                      duration: payload.session.duration,
                      sales_count: payload.session.sales_count,
                      total_sales: payload.session.total_sales,
                      lcd: {
                        connected: payload.session.lcd_connected || false,
                        port: payload.session.lcd_port || null,
                      },
                    },
              sessionError: null, // Clear erreur si succès
            }));
          }
        };

        // ✅ LISTENER : MISE À JOUR STATS SESSION
        const handleSessionStatsUpdated = (payload) => {
          console.log('📈 [SESSION STORE] Stats session mises à jour:', payload);

          // Filtrer par utilisateur connecté
          if (payload.cashier_id === userId) {
            console.log(
              `💰 [SESSION STORE] Stats mises à jour pour utilisateur connecté: ${payload.stats.sales_count} ventes, ${payload.stats.total_sales}€`
            );

            set((state) => ({
              ...state,
              cashierSession: state.cashierSession
                ? {
                    ...state.cashierSession,
                    sales_count: payload.stats.sales_count,
                    total_sales: payload.stats.total_sales,
                    last_sale: payload.stats.last_sale_at,
                  }
                : state.cashierSession,
            }));
          }
        };

        // ✅ LISTENER : CHANGEMENT PROPRIÉTÉ LCD
        const handleLCDOwnershipChanged = (payload) => {
          console.log('📺 [SESSION STORE] Propriété LCD changée:', payload);

          set((state) => ({
            ...state,
            lcdStatus: {
              owned: payload.owned,
              owner: payload.owner,
              display_status: state.lcdStatus?.display_status || null,
            },
            lcdError: null, // Clear erreur si changement réussi
            // Mettre à jour la session si c'est notre utilisateur
            cashierSession:
              state.cashierSession &&
              (payload.owner?.cashier_id === userId ||
                payload.previous_owner?.cashier_id === userId)
                ? {
                    ...state.cashierSession,
                    lcd: {
                      connected: payload.owned && payload.owner?.cashier_id === userId,
                      port:
                        payload.owned && payload.owner?.cashier_id === userId
                          ? payload.owner.port
                          : null,
                    },
                  }
                : state.cashierSession,
          }));
        };

        // ✅ ENREGISTREMENT DES LISTENERS
        websocketService.on('cashier_session.status.changed', handleSessionStatusChanged);
        websocketService.on('cashier_session.stats.updated', handleSessionStatsUpdated);
        websocketService.on('lcd.ownership.changed', handleLCDOwnershipChanged);

        // ✅ ABONNEMENTS (pas besoin de subscribe car ces événements sont globaux)
        // Note: Les événements session/LCD sont broadcastés à tous les clients

        // ✅ MARQUER COMME INITIALISÉ
        set((state) => ({
          ...state,
          wsListenersInitialized: true,
        }));

        console.log('✅ [SESSION STORE] Listeners WebSocket initialisés avec succès');

        // ✅ FONCTION DE NETTOYAGE
        return () => {
          console.log('🧹 [SESSION STORE] Nettoyage listeners WebSocket');
          websocketService.off('cashier_session.status.changed', handleSessionStatusChanged);
          websocketService.off('cashier_session.stats.updated', handleSessionStatsUpdated);
          websocketService.off('lcd.ownership.changed', handleLCDOwnershipChanged);

          set((state) => ({
            ...state,
            wsListenersInitialized: false,
          }));
        };
      } catch (error) {
        console.error('[SESSION STORE] Erreur initialisation listeners WebSocket:', error);
        return null;
      }
    },

    // ✅ ACTIONS SESSION CAISSE (MISES À JOUR SANS SYNC)
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

        // ✅ MISE À JOUR IMMÉDIATE - SANS TOUCHER AU LCDSTATUS (WebSocket s'en charge)
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: data.session,
          // ✅ PAS DE lcdStatus ici - WebSocket seul maître !
        }));

        console.log('✅ [SESSION STORE] Session démarrée via WebSocket', data);
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

        // ✅ RESET IMMÉDIAT (WebSocket confirmera)
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: null,
          lcdStatus: null,
          lcdError: null,
        }));

        console.log('🛑 [SESSION STORE] Session fermée (WebSocket confirmera)');
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

    // ✅ ACTIONS LCD (WEBSOCKET SEUL MAÎTRE)
    requestLCD: async (port, config = {}) => {
      set((state) => ({ ...state, lcdLoading: true, lcdError: null }));

      try {
        const response = await cashierSessionService.requestLCDControl(port, config);

        // ✅ NE PAS METTRE À JOUR LCDSTATUS - WebSocket s'en charge !
        set((state) => ({
          ...state,
          lcdLoading: false,
          // ✅ PAS DE lcdStatus ici !
        }));

        console.log('✅ [SESSION STORE] LCD demandé via WebSocket');
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

        // ✅ NE PAS METTRE À JOUR LCDSTATUS - WebSocket s'en charge !
        set((state) => ({
          ...state,
          lcdLoading: false,
          // ✅ PAS DE lcdStatus ici !
        }));

        console.log('✅ [SESSION STORE] LCD libéré via WebSocket');
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

    // ✅ OPÉRATIONS LCD AVEC GESTION D'ERREUR (INCHANGÉES)
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

        // Sync initial si erreur de session (fallback)
        if (message.includes('non assigné') || message.includes('session')) {
          console.log('⚠️ [SESSION STORE] Erreur session, sync initiale de fallback');
          get().syncInitialState();
        }

        throw error;
      }
    },

    // ✅ MÉTHODES LCD RACCOURCIES (INCHANGÉES)
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
        wsListenersInitialized: false,
      })),
  }))
);

// ✅ HOOKS SÉLECTEURS STABLES POUR OPTIMISER LES RE-RENDERS (INCHANGÉS)
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

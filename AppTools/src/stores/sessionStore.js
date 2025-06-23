// src/stores/sessionStore.js - ZUSTAND UNIFIÉ AVEC WEBSOCKET + FOND DE CAISSE
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import cashierSessionService from '../services/cashierSessionService';
import apiService from '../services/api';

const getAuthToken = () => {
  return (
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    sessionStorage.getItem('token')
  );
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

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

    // ✅ NOUVEAUX ÉTATS FOND DE CAISSE
    drawer: {
      isOpen: false,
      openingAmount: 0,
      currentAmount: 0,
      expectedAmount: 0,
      variance: 0,
      openedAt: null,
      openedBy: null,
      denominations: {},
      movements: [],
      notes: null,
    },

    drawerLoading: false,
    drawerError: null,

    // États UI pour modales
    showDrawerMovementModal: false,

    // ✅ ÉTAT WEBSOCKET
    wsListenersInitialized: false,

    // ✅ SYNCHRONISATION INITIALE UNIQUEMENT (PLUS DE POLLING)
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

        // ✅ NOUVEAU : Sync drawer si session active
        if (data.session) {
          get().syncDrawerState();
        }

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

    // ✅ INITIALISATION DES LISTENERS WEBSOCKET
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
              // ✅ NOUVEAU : Reset drawer si session fermée
              ...(payload.session.status === 'closed' && {
                drawer: {
                  isOpen: false,
                  openingAmount: 0,
                  currentAmount: 0,
                  expectedAmount: 0,
                  variance: 0,
                  openedAt: null,
                  openedBy: null,
                  denominations: {},
                  movements: [],
                  notes: null,
                },
              }),
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

        // ✅ NOUVEAU : LISTENER MOUVEMENT CAISSE
        const handleDrawerMovement = (payload) => {
          console.log('💸 [SESSION STORE] Mouvement caisse reçu:', payload);

          if (payload.cashier_id === userId) {
            set((state) => {
              // ✅ VÉRIFIER SI LE MOUVEMENT EXISTE DÉJÀ
              const existingMovement = state.drawer.movements.find(
                (mov) => mov.id === payload.movement.id
              );

              if (existingMovement) {
                console.log(
                  '⏭️ [SESSION STORE] Mouvement déjà présent, ignoré:',
                  payload.movement.id
                );
                // ✅ JUSTE METTRE À JOUR LES MONTANTS SANS AJOUTER LE MOUVEMENT
                if (payload.drawer_state) {
                  return {
                    ...state,
                    drawer: {
                      ...state.drawer,
                      currentAmount: payload.drawer_state.currentAmount,
                      expectedAmount: payload.drawer_state.expectedAmount,
                      variance: payload.drawer_state.variance,
                      // ✅ NE PAS MODIFIER LA LISTE DES MOUVEMENTS
                    },
                  };
                } else {
                  // Recalculer les montants sans dupliquer
                  let expectedAmount = state.drawer.openingAmount;
                  state.drawer.movements.forEach((movement) => {
                    if (movement.type === 'in') expectedAmount += movement.amount;
                    else expectedAmount -= movement.amount;
                  });

                  return {
                    ...state,
                    drawer: {
                      ...state.drawer,
                      currentAmount: payload.new_balance,
                      expectedAmount: expectedAmount,
                      variance: payload.new_balance - expectedAmount,
                      // ✅ NE PAS MODIFIER LA LISTE DES MOUVEMENTS
                    },
                  };
                }
              }

              // ✅ MOUVEMENT NOUVEAU : L'AJOUTER NORMALEMENT
              console.log('✅ [SESSION STORE] Nouveau mouvement ajouté:', payload.movement.id);

              if (payload.drawer_state) {
                // Nouvelle structure avec drawer_state
                return {
                  ...state,
                  drawer: {
                    ...state.drawer,
                    currentAmount: payload.drawer_state.currentAmount,
                    expectedAmount: payload.drawer_state.expectedAmount,
                    variance: payload.drawer_state.variance,
                    movements: [payload.movement, ...state.drawer.movements.slice(0, 49)],
                  },
                };
              } else {
                // Fallback : Ancienne structure ou calcul manuel
                const movements = [payload.movement, ...state.drawer.movements.slice(0, 49)];

                let expectedAmount = state.drawer.openingAmount;
                movements.forEach((movement) => {
                  if (movement.type === 'in') expectedAmount += movement.amount;
                  else expectedAmount -= movement.amount;
                });

                const newVariance = payload.new_balance - expectedAmount;

                return {
                  ...state,
                  drawer: {
                    ...state.drawer,
                    currentAmount: payload.new_balance,
                    expectedAmount: expectedAmount,
                    variance: newVariance,
                    movements: movements,
                  },
                };
              }
            });
          }
        };

        // ✅ NOUVEAU : LISTENER STATUT CAISSE
        const handleDrawerStatus = (payload) => {
          console.log('💰 [SESSION STORE] Statut caisse changé:', payload);

          if (payload.cashier_id === userId) {
            set((state) => ({
              ...state,
              drawer: {
                ...state.drawer,
                currentAmount: payload.current_amount,
                expectedAmount: payload.expected_amount,
                variance: payload.variance,
              },
            }));
          }
        };

        // ✅ ENREGISTREMENT DES LISTENERS
        websocketService.on('cashier_session.status.changed', handleSessionStatusChanged);
        websocketService.on('cashier_session.stats.updated', handleSessionStatsUpdated);
        websocketService.on('lcd.ownership.changed', handleLCDOwnershipChanged);
        websocketService.on('cashier_drawer.movement.added', handleDrawerMovement);
        websocketService.on('cashier_drawer.status.changed', handleDrawerStatus);
        websocketService.on('lcd.connection.lost', () => {
          set((state) => ({ ...state, lcdError: 'LCD déconnecté - Reconnexion en cours...' }));
        });

        websocketService.on('lcd.connection.restored', (payload) => {
          console.log('✅ [SESSION STORE] Event lcd.connection.restored reçu:', payload);
          set((state) => ({ ...state, lcdError: null }));
        });

        websocketService.on('lcd.connection.failed', () => {
          set((state) => ({ ...state, lcdError: 'LCD déconnecté - Reconnexion échouée' }));
        });

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
          websocketService.off('cashier_drawer.movement.added', handleDrawerMovement);
          websocketService.off('cashier_drawer.status.changed', handleDrawerStatus);

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

    // ✅ ACTIONS SESSION CAISSE MODIFIÉES
    startSession: async (lcdPort = null, lcdConfig = {}, drawerData = null) => {
      const state = get();
      if (!state.isAuthenticated) {
        throw new Error('Utilisateur non authentifié');
      }

      // Validation drawer obligatoire
      if (!drawerData || !drawerData.opening_amount || drawerData.opening_amount <= 0) {
        throw new Error('Données du fond de caisse obligatoires');
      }

      set((state) => ({
        ...state,
        sessionLoading: true,
        sessionError: null,
        lcdError: null,
        drawerError: null,
      }));

      try {
        const response = await cashierSessionService.openSession(lcdPort, lcdConfig, drawerData);

        // ✅ DEBUG : Vérifier la structure de réponse
        console.log('🔍 [SESSION STORE] Structure de réponse reçue:', response);

        // ✅ FIX : Gérer la structure {success: true, data: {...}}
        let sessionData;

        if (response.success && response.data) {
          // Structure {success: true, data: {session: ...}}
          if (response.data.session) {
            sessionData = response.data;
            console.log('📍 [SESSION STORE] Structure: response.data avec session');
          } else if (response.data.data && response.data.data.session) {
            // Structure {success: true, data: {data: {session: ...}}}
            sessionData = response.data.data;
            console.log('📍 [SESSION STORE] Structure: response.data.data avec session');
          } else {
            // La réponse data contient directement les infos de session
            console.log(
              '📍 [SESSION STORE] Structure: response.data contient les données de session'
            );
            console.log('🔍 [SESSION STORE] Contenu data:', response.data);

            // Si response.data a les propriétés de session directement
            if (response.data.success !== undefined) {
              // C'est probablement une réponse du service qui a déjà le bon format
              sessionData = {
                session: response.data.session || {
                  // Construire la session à partir des données disponibles
                  cashier_id: response.data.cashier_id,
                  username: response.data.username,
                  status: 'active',
                  startTime: new Date().toISOString(),
                  drawer: {
                    opening_amount: drawerData.opening_amount,
                    current_amount: drawerData.opening_amount,
                    expected_amount: drawerData.opening_amount,
                    denominations: drawerData.denominations || {},
                    method: drawerData.method || 'custom',
                    notes: drawerData.notes || null,
                    opened_at: new Date().toISOString(),
                    movements: [],
                  },
                },
              };
              console.log('📍 [SESSION STORE] Session construite à partir des données API');
            } else {
              throw new Error('Structure de réponse API non reconnue');
            }
          }
        } else if (response.data && response.data.session) {
          // Structure directe response.data.session
          sessionData = response.data;
          console.log('📍 [SESSION STORE] Structure: response.data directe');
        } else if (response.session) {
          // Structure directe response.session
          sessionData = response;
          console.log('📍 [SESSION STORE] Structure: response directe');
        } else {
          console.error('❌ [SESSION STORE] Aucune structure connue trouvée');
          console.error('🔍 [SESSION STORE] Response complète:', JSON.stringify(response, null, 2));
          throw new Error('Structure de réponse API invalide - aucun format reconnu');
        }

        console.log('✅ [SESSION STORE] Données session extraites:', sessionData);

        // ✅ FIX : Vérifier la présence de drawer avec fallback
        if (!sessionData.session) {
          throw new Error('Session manquante dans les données extraites');
        }

        if (!sessionData.session.drawer) {
          console.warn('⚠️ [SESSION STORE] Drawer manquant dans session, création de fallback');
          sessionData.session.drawer = {
            opening_amount: drawerData.opening_amount,
            current_amount: drawerData.opening_amount,
            expected_amount: drawerData.opening_amount,
            denominations: drawerData.denominations || {},
            method: drawerData.method || 'custom',
            notes: drawerData.notes || null,
            opened_at: new Date().toISOString(),
            movements: [],
          };
        }

        // ✅ MISE À JOUR AVEC VÉRIFICATIONS
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: sessionData.session,
          drawer: {
            isOpen: true,
            openingAmount: sessionData.session.drawer.opening_amount || drawerData.opening_amount,
            currentAmount: sessionData.session.drawer.current_amount || drawerData.opening_amount,
            expectedAmount: sessionData.session.drawer.expected_amount || drawerData.opening_amount,
            variance:
              (sessionData.session.drawer.current_amount || drawerData.opening_amount) -
              (sessionData.session.drawer.expected_amount || drawerData.opening_amount),
            openedAt: sessionData.session.drawer.opened_at || new Date().toISOString(),
            openedBy: sessionData.session.username || 'Utilisateur',
            denominations:
              sessionData.session.drawer.denominations || drawerData.denominations || {},
            movements: sessionData.session.drawer.movements || [],
            notes: sessionData.session.drawer.notes || drawerData.notes,
          },
        }));

        console.log('✅ [SESSION STORE] Session + fond démarrés avec succès');
        return sessionData;
      } catch (error) {
        const message = error.response?.data?.message || error.message;

        console.error('❌ [SESSION STORE] Erreur ouverture session:', {
          error: error,
          message: message,
          response: error.response?.data,
        });

        set((state) => ({
          ...state,
          sessionLoading: false,
          ...(message.includes('LCD')
            ? { lcdError: message }
            : message.includes('fond') || message.includes('caisse')
              ? { drawerError: message }
              : { sessionError: message }),
        }));

        throw error;
      }
    },
    stopSession: async (closingData = null) => {
      set((state) => ({
        ...state,
        sessionLoading: true,
        sessionError: null,
        drawerError: null,
      }));

      try {
        let response;

        if (closingData) {
          // ✅ CORRECTION : Utiliser apiService au lieu de fetch direct
          response = await apiService.post('/api/cashier/drawer/close', closingData);
        } else {
          response = await cashierSessionService.closeSession();
        }

        // Reset immédiat (WebSocket confirmera)
        set((state) => ({
          ...state,
          sessionLoading: false,
          cashierSession: null,
          lcdStatus: null,
          lcdError: null,
          drawer: {
            isOpen: false,
            openingAmount: 0,
            currentAmount: 0,
            expectedAmount: 0,
            variance: 0,
            openedAt: null,
            openedBy: null,
            denominations: {},
            movements: [],
            notes: null,
          },
          drawerError: null,
        }));

        console.log('🛑 [SESSION STORE] Session + fond fermés (WebSocket confirmera)');
        return response.data || response;
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

    // ✅ NOUVEAU : ACTIONS FOND DE CAISSE
    addCashMovement: async (movementData) => {
      set((state) => ({ ...state, drawerLoading: true, drawerError: null }));

      try {
        // ✅ CORRECTION : Utiliser apiService au lieu de fetch direct
        const response = await apiService.post('/api/cashier/drawer/movement', movementData);

        const result = response.data;

        set((state) => ({
          ...state,
          drawerLoading: false,
          drawer: {
            ...state.drawer,
            currentAmount: result.data.new_balance,
            variance: result.data.new_balance - state.drawer.expectedAmount,
            movements: [result.data.movement, ...state.drawer.movements.slice(0, 49)],
          },
          showDrawerMovementModal: false,
        }));

        console.log('✅ [SESSION STORE] Mouvement ajouté', result.data);
        return result.data;
      } catch (error) {
        set((state) => ({
          ...state,
          drawerLoading: false,
          drawerError: error.response?.data?.message || error.message,
        }));
        throw error;
      }
    },

    // ✅ NOUVEAU : Synchroniser fond de caisse
    syncDrawerState: async () => {
      try {
        // ✅ CORRECTION : Utiliser apiService au lieu de fetch direct
        const response = await apiService.get('/api/cashier/drawer/status');

        const result = response.data;

        if (result.success && result.data.drawer) {
          set((state) => ({
            ...state,
            drawer: {
              isOpen: true,
              openingAmount: result.data.drawer.opening_amount,
              currentAmount: result.data.drawer.current_amount,
              expectedAmount: result.data.drawer.expected_amount,
              variance: result.data.drawer.variance || 0,
              openedAt: result.data.drawer.opened_at,
              openedBy: result.data.drawer.opened_by,
              denominations: result.data.drawer.denominations || {},
              movements: result.data.drawer.movements || [],
              notes: result.data.drawer.notes,
            },
          }));

          console.log('✅ [SESSION STORE] État fond synchronisé');
        }
      } catch (error) {
        console.debug('⚠️ [SESSION STORE] Erreur sync fond de caisse:', error.message);
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
    setDrawerError: (error) => set((state) => ({ ...state, drawerError: error })),
    setShowDrawerMovementModal: (show) =>
      set((state) => ({ ...state, showDrawerMovementModal: show })),
    clearErrors: () =>
      set((state) => ({
        ...state,
        sessionError: null,
        lcdError: null,
        authError: null,
        drawerError: null,
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
        drawer: {
          isOpen: false,
          openingAmount: 0,
          currentAmount: 0,
          expectedAmount: 0,
          variance: 0,
          openedAt: null,
          openedBy: null,
          denominations: {},
          movements: [],
          notes: null,
        },
        drawerLoading: false,
        drawerError: null,
        showDrawerMovementModal: false,
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

// ✅ NOUVEAU : HOOK SÉLECTEUR POUR LE FOND DE CAISSE
export const useDrawer = () => {
  const drawer = useSessionStore((state) => state.drawer);
  const drawerLoading = useSessionStore((state) => state.drawerLoading);
  const drawerError = useSessionStore((state) => state.drawerError);
  const showDrawerMovementModal = useSessionStore((state) => state.showDrawerMovementModal);

  const addCashMovement = useSessionStore((state) => state.addCashMovement);
  const syncDrawerState = useSessionStore((state) => state.syncDrawerState);

  const setShowDrawerMovementModal = useSessionStore((state) => state.setShowDrawerMovementModal);
  const setDrawerError = useSessionStore((state) => state.setDrawerError);

  // ✅ CALCULÉS STABLES
  const hasOpenDrawer = Boolean(drawer?.isOpen);
  const drawerBalance = drawer?.currentAmount || 0;
  const expectedBalance = drawer?.expectedAmount || 0;
  const variance = drawerBalance - expectedBalance;

  return {
    drawer,
    hasOpenDrawer,
    drawerBalance,
    expectedBalance,
    variance,
    drawerLoading,
    drawerError,
    showDrawerMovementModal,
    addCashMovement,
    syncDrawerState,
    setShowDrawerMovementModal,
    setDrawerError,
  };
};

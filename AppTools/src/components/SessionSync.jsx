// src/components/SessionSync.jsx - SYNCHRONISATION AVEC WEBSOCKET (SANS POLLING)
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSessionStore } from '../stores/sessionStore';

// ✅ HOOK DE SYNCHRONISATION WEBSOCKET (REMPLACE LE POLLING)
const useSessionSync = () => {
  const syncInitialState = useSessionStore((state) => state.syncInitialState);
  const initWebSocketListeners = useSessionStore((state) => state.initWebSocketListeners);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);
  const wsListenersInitialized = useSessionStore((state) => state.wsListenersInitialized);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('⚠️ [SESSION SYNC] Utilisateur non authentifié, pas de sync');
      return;
    }

    console.log(`🔄 [SESSION SYNC] Initialisation pour utilisateur ${user.username} (${user.id})`);

    let cleanupWebSocket = null;

    // ✅ 1. SYNC INITIALE (une seule fois, pas de polling)
    syncInitialState()
      .then(() => {
        console.log('✅ [SESSION SYNC] Synchronisation initiale terminée');
      })
      .catch((error) => {
        if (!error.message.includes('Aucune session')) {
          console.warn('[SESSION SYNC] Erreur sync initiale:', error.message);
        }
      });

    // ✅ 2. INITIALISER WEBSOCKET LISTENERS (si pas déjà fait)
    if (!wsListenersInitialized) {
      console.log('🔔 [SESSION SYNC] Initialisation des listeners WebSocket');

      initWebSocketListeners()
        .then((cleanup) => {
          if (cleanup && typeof cleanup === 'function') {
            cleanupWebSocket = cleanup;
            console.log('✅ [SESSION SYNC] Listeners WebSocket initialisés');
          }
        })
        .catch((error) => {
          console.warn('[SESSION SYNC] Erreur initialisation WebSocket:', error);
        });
    } else {
      console.log('⏭️ [SESSION SYNC] Listeners WebSocket déjà initialisés');
    }

    // ✅ CLEANUP
    return () => {
      console.log('🧹 [SESSION SYNC] Nettoyage pour utilisateur', user.username);
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
    };
  }, [isAuthenticated, user, syncInitialState, initWebSocketListeners, wsListenersInitialized]);
};

// ✅ COMPOSANT QUI SYNCHRONISE AUTH ET SESSION STORE
export const SessionSync = () => {
  const { user, isAuthenticated } = useAuth();
  const setUser = useSessionStore((state) => state.setUser);
  const reset = useSessionStore((state) => state.reset);

  // ✅ SYNCHRONISER AUTH AVEC ZUSTAND
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 [SESSION SYNC] Utilisateur connecté:', user.username);
      setUser(user);
    } else {
      console.log('🔄 [SESSION SYNC] Utilisateur déconnecté - Reset store');
      reset();
    }
  }, [isAuthenticated, user, setUser, reset]);

  // ✅ UTILISER LE HOOK DE SYNCHRONISATION WEBSOCKET
  useSessionSync();

  return null; // Composant invisible
};

// ✅ WRAPPER POUR APP.JSX
export const SessionProvider = ({ children }) => {
  return (
    <>
      <SessionSync />
      {children}
    </>
  );
};

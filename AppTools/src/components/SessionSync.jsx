// src/components/SessionSync.jsx - COMPOSANT DE SYNCHRONISATION AUTOMATIQUE
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSessionStore } from '../stores/sessionStore';

// ✅ HOOK DE SYNCHRONISATION DÉPLACÉ ICI
const useSessionSync = () => {
  const syncSessionState = useSessionStore((state) => state.syncSessionState);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Sync initial
      syncSessionState();

      // Sync périodique
      const interval = setInterval(syncSessionState, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, syncSessionState]);
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
      console.log('🔄 [SESSION SYNC] Utilisateur déconnecté');
      reset();
    }
  }, [isAuthenticated, user, setUser, reset]);

  // ✅ UTILISER LE HOOK DE SYNCHRONISATION AUTOMATIQUE
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

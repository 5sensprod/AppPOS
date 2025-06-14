// src/features/pos/hooks/useCashierSession.js - FIX DÉLAI SYNCHRONISATION
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import cashierSessionService from '../../../services/cashierSessionService';

export const useCashierSession = () => {
  // États de session
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  // États LCD
  const [lcdStatus, setLcdStatus] = useState(null);
  const [lcdLoading, setLcdLoading] = useState(false);
  const [lcdError, setLcdError] = useState(null);
  const [lcdPorts, setLcdPorts] = useState([]);

  // États UI
  const [showSessionModal, setShowSessionModal] = useState(false);

  const { user } = useAuth();
  const statusCheckInterval = useRef(null);

  // ✅ VÉRIFICATION PÉRIODIQUE - FONCTION STABLE
  const checkStatus = useCallback(async () => {
    if (!user) return;

    try {
      const response = await cashierSessionService.getSessionStatus();
      const data = response.data;

      setSession(data.session);
      setLcdStatus(data.lcd_status);

      // Clear les erreurs si tout va bien
      if (data.session) {
        setSessionError(null);
      }
      if (data.can_use_lcd) {
        setLcdError(null);
      }
    } catch (error) {
      // Ne pas afficher d'erreur si pas de session (normal)
      if (!error.message.includes('Aucune session')) {
        setSessionError(error.message);
      }
    }
  }, [user]);

  // Initialisation et vérification périodique
  useEffect(() => {
    if (user) {
      checkStatus();

      // ✅ RÉDUIRE L'INTERVALLE pour plus de réactivité
      statusCheckInterval.current = setInterval(checkStatus, 10000); // 10s au lieu de 30s
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [user, checkStatus]);

  // ✅ GESTION DE SESSION AVEC SYNC IMMÉDIATE
  const openSession = useCallback(
    async (lcdPort = null, lcdConfig = {}) => {
      setSessionLoading(true);
      setSessionError(null);

      try {
        const response = await cashierSessionService.openSession(lcdPort, lcdConfig);
        const data = response.data;

        // ✅ MISE À JOUR IMMÉDIATE de l'état local
        setSession(data.session);
        setLcdStatus(data.lcd_status);

        // ✅ FORCER UNE VÉRIFICATION pour synchroniser avec le serveur
        setTimeout(() => {
          checkStatus();
        }, 500); // Petit délai pour laisser le serveur se stabiliser

        return data;
      } catch (error) {
        setSessionError(error.response?.data?.message || error.message);
        throw error;
      } finally {
        setSessionLoading(false);
      }
    },
    [checkStatus]
  );

  const closeSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError(null);

    try {
      const response = await cashierSessionService.closeSession();

      // ✅ MISE À JOUR IMMÉDIATE de l'état local
      setSession(null);
      setLcdStatus(null);
      setLcdError(null);

      // ✅ FORCER UNE VÉRIFICATION pour synchroniser avec le serveur
      setTimeout(() => {
        checkStatus();
      }, 500);

      return response.data;
    } catch (error) {
      setSessionError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setSessionLoading(false);
    }
  }, [checkStatus]);

  // Gestion LCD
  const loadLCDPorts = useCallback(async () => {
    try {
      const response = await cashierSessionService.listLCDPorts();
      setLcdPorts(response.data.available_ports || []);
      return response.data;
    } catch (error) {
      setLcdError(error.message);
      throw error;
    }
  }, []);

  const requestLCDControl = useCallback(
    async (port, config = {}) => {
      setLcdLoading(true);
      setLcdError(null);

      try {
        const response = await cashierSessionService.requestLCDControl(port, config);

        // ✅ MISE À JOUR IMMÉDIATE
        setLcdStatus(response.data.lcd_status);

        // ✅ FORCER UNE VÉRIFICATION
        setTimeout(() => {
          checkStatus();
        }, 500);

        return response.data;
      } catch (error) {
        setLcdError(error.response?.data?.message || error.message);
        throw error;
      } finally {
        setLcdLoading(false);
      }
    },
    [checkStatus]
  );

  const releaseLCDControl = useCallback(async () => {
    setLcdLoading(true);
    setLcdError(null);

    try {
      const response = await cashierSessionService.releaseLCDControl();

      // ✅ MISE À JOUR IMMÉDIATE
      setLcdStatus(response.data.lcd_status);

      // ✅ FORCER UNE VÉRIFICATION
      setTimeout(() => {
        checkStatus();
      }, 500);

      return response.data;
    } catch (error) {
      setLcdError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLcdLoading(false);
    }
  }, [checkStatus]);

  // Utilisation LCD avec gestion d'erreur
  const safeLCDOperation = useCallback(
    async (operation, operationName) => {
      try {
        const result = await operation();

        // Reset erreur LCD en cas de succès
        if (lcdError) {
          setLcdError(null);
        }

        return result;
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;

        setLcdError(errorMessage);

        // Si erreur de session, rafraîchir le statut IMMÉDIATEMENT
        if (errorMessage.includes('non assigné') || errorMessage.includes('session')) {
          checkStatus();
        }

        throw error;
      }
    },
    [lcdError, checkStatus]
  );

  // Méthodes LCD (identiques)
  const lcdOperations = {
    writeMessage: useCallback(
      async (line1, line2) => {
        return await safeLCDOperation(
          () => cashierSessionService.writeLCDMessage(line1, line2),
          'writeMessage'
        );
      },
      [safeLCDOperation]
    ),

    showPrice: useCallback(
      async (itemName, price) => {
        return await safeLCDOperation(
          () => cashierSessionService.showLCDPrice(itemName, price),
          'showPrice'
        );
      },
      [safeLCDOperation]
    ),

    showTotal: useCallback(
      async (total) => {
        return await safeLCDOperation(() => cashierSessionService.showLCDTotal(total), 'showTotal');
      },
      [safeLCDOperation]
    ),

    showWelcome: useCallback(async () => {
      return await safeLCDOperation(() => cashierSessionService.showLCDWelcome(), 'showWelcome');
    }, [safeLCDOperation]),

    showThankYou: useCallback(async () => {
      return await safeLCDOperation(() => cashierSessionService.showLCDThankYou(), 'showThankYou');
    }, [safeLCDOperation]),

    clearDisplay: useCallback(async () => {
      return await safeLCDOperation(() => cashierSessionService.clearLCDDisplay(), 'clearDisplay');
    }, [safeLCDOperation]),
  };

  // Utilitaires
  const hasActiveSession = Boolean(session && session.status === 'active');
  const hasLCDControl = Boolean(lcdStatus?.owned && lcdStatus?.owner?.cashier_id === user?.id);
  const canUseLCD = hasActiveSession && hasLCDControl;

  return {
    // États de session
    session,
    sessionLoading,
    sessionError,
    hasActiveSession,

    // États LCD
    lcdStatus,
    lcdLoading,
    lcdError,
    lcdPorts,
    hasLCDControl,
    canUseLCD,

    // Actions de session
    openSession,
    closeSession,
    checkStatus,

    // Actions LCD
    loadLCDPorts,
    requestLCDControl,
    releaseLCDControl,

    // Opérations LCD
    lcd: lcdOperations,

    // UI
    showSessionModal,
    setShowSessionModal,

    // Utilitaires
    setSessionError,
    setLcdError,
  };
};

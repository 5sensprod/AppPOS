// src/features/pos/hooks/useLCDIntegration.js
import { useState, useEffect, useCallback, useRef } from 'react';
import lcdService from '../../../services/lcdService';

export const useLCDIntegration = () => {
  const [lcdConnected, setLcdConnected] = useState(false);
  const [lcdError, setLcdError] = useState(null);
  const [lcdLoading, setLcdLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState(null);

  // Refs pour éviter les appels multiples et tracker l'état
  const isCheckingStatus = useRef(false);
  const lastStatusCheck = useRef(0);
  const statusCheckInterval = useRef(null);
  const operationQueue = useRef(new Map());
  const lastDisplayedContent = useRef(null);
  const consecutiveErrors = useRef(0);
  const isTemporarilyDisabled = useRef(false);
  const connectionAttempts = useRef(0);

  // 🔧 DIAGNOSTIC AVANCÉ DES ERREURS LCD
  const analyzeLCDError = useCallback((error) => {
    const errorData = {
      type: 'unknown',
      message: error.message,
      suggestion: 'Vérifiez la connexion LCD',
      code: error.code,
      status: error.response?.status,
    };

    // Analyser le type d'erreur
    if (error.response?.status === 500) {
      if (error.message.includes('non connecté') || error.message.includes('not connected')) {
        errorData.type = 'disconnected';
        errorData.message = 'LCD non connecté';
        errorData.suggestion = "Connectez l'écran LCD via les paramètres";
      } else if (error.message.includes('port') || error.message.includes('COM')) {
        errorData.type = 'port_error';
        errorData.message = 'Problème de port série';
        errorData.suggestion = 'Vérifiez le port COM dans les paramètres';
      } else {
        errorData.type = 'server_error';
        errorData.message = 'Erreur interne du serveur LCD';
        errorData.suggestion = 'Redémarrez le service ou vérifiez les logs serveur';
      }
    } else if (error.code === 'ERR_NETWORK') {
      errorData.type = 'network';
      errorData.message = "Problème réseau avec l'API LCD";
      errorData.suggestion = 'Vérifiez que le serveur est accessible';
    } else if (error.code === 'ERR_BAD_RESPONSE') {
      errorData.type = 'bad_response';
      errorData.message = 'Réponse invalide du serveur LCD';
      errorData.suggestion = 'Le serveur LCD rencontre des problèmes';
    }

    return errorData;
  }, []);

  // 🔧 CIRCUIT BREAKER INTELLIGENT
  const checkCircuitBreaker = useCallback(() => {
    if (consecutiveErrors.current >= 3) {
      // Réduit de 5 à 3
      if (!isTemporarilyDisabled.current) {
        console.warn("🔴 LCD circuit breaker activé - trop d'erreurs consécutives");
        isTemporarilyDisabled.current = true;
        setLcdError("LCD temporairement désactivé (trop d'erreurs)");

        // Réactiver après 20 secondes (réduit de 30 à 20)
        setTimeout(() => {
          console.info('🟡 Réactivation du LCD après circuit breaker');
          isTemporarilyDisabled.current = false;
          consecutiveErrors.current = 0;
          setLcdError(null);
        }, 20000);
      }
      return false;
    }
    return true;
  }, []);

  // 🔧 VÉRIFICATION STATUT AVEC DIAGNOSTIC
  const checkLCDStatus = useCallback(async () => {
    // Vérification en arrière-plan, sans bloquer l'affichage
    if (isCheckingStatus.current) return;

    // Réduire la fréquence minimum de 10s à 5s
    const now = Date.now();
    if (now - lastStatusCheck.current < 5000) return;

    isCheckingStatus.current = true;
    lastStatusCheck.current = now;

    try {
      const response = await lcdService.getStatus();
      const status = response.data?.status;
      const connected = status?.connected || false;

      // Mettre à jour les infos de diagnostic
      setDiagnosticInfo({
        lastCheck: new Date().toLocaleTimeString('fr-FR'),
        connected,
        display: status?.display,
        activeConnections: response.data?.activeConnections,
        session: status?.session,
      });

      setLcdConnected(connected);

      if (connected) {
        consecutiveErrors.current = 0;
        connectionAttempts.current = 0;
        if (lcdError) {
          setLcdError(null);
          console.info('✅ LCD reconnecté');
        }
      } else if (!lcdError) {
        setLcdError("LCD non connecté - Connectez l'écran via les paramètres");
      }
    } catch (error) {
      consecutiveErrors.current++;
      connectionAttempts.current++;

      const diagnostic = analyzeLCDError(error);
      console.warn(`LCD status check failed (${consecutiveErrors.current}/3):`, diagnostic);

      setLcdConnected(false);
      setDiagnosticInfo({
        lastCheck: new Date().toLocaleTimeString('fr-FR'),
        connected: false,
        error: diagnostic,
        attempts: connectionAttempts.current,
      });

      if (!isTemporarilyDisabled.current) {
        setLcdError(diagnostic.message + ' - ' + diagnostic.suggestion);
      }

      checkCircuitBreaker();
    } finally {
      isCheckingStatus.current = false;
    }
  }, [lcdError, analyzeLCDError, checkCircuitBreaker]);

  // 🔧 AUTO-RECONNECTION INTELLIGENTE
  const attemptAutoReconnection = useCallback(async () => {
    if (connectionAttempts.current >= 3) {
      console.info('🔄 Tentative de reconnexion automatique...');

      try {
        // Vérifier les ports disponibles
        const portsResponse = await lcdService.listPorts();
        const availablePorts = portsResponse.data?.ports || [];

        setDiagnosticInfo((prev) => ({
          ...prev,
          availablePorts,
          reconnectionAttempt: new Date().toLocaleTimeString('fr-FR'),
        }));

        // Si ports disponibles, suggérer une reconnexion
        if (availablePorts.length > 0) {
          setLcdError(
            `Ports disponibles détectés: ${availablePorts.map((p) => p.path).join(', ')}. ` +
              'Configurez la connexion LCD dans les paramètres.'
          );
        }

        // Reset compteur après diagnostic
        connectionAttempts.current = 0;
      } catch (error) {
        console.warn('Auto-reconnection failed:', error);
      }
    }
  }, []);

  // Vérification périodique avec auto-reconnection
  useEffect(() => {
    // Vérification initiale après 3 secondes
    const initialCheck = setTimeout(() => {
      checkLCDStatus();
    }, 3000);

    // Vérification toutes les 90 secondes
    statusCheckInterval.current = setInterval(() => {
      checkLCDStatus().then(() => {
        // Tentative d'auto-reconnection si nécessaire
        if (!lcdConnected && connectionAttempts.current >= 3) {
          attemptAutoReconnection();
        }
      });
    }, 90000);

    return () => {
      clearTimeout(initialCheck);
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [checkLCDStatus, lcdConnected, attemptAutoReconnection]);

  // 🔧 ANTI-DUPLICATE OPTIMISÉ
  const isDuplicateOperation = useCallback((operationKey, operationData) => {
    const lastContent = lastDisplayedContent.current;

    // Autoriser les mises à jour fréquentes du panier
    if (operationKey === 'cart_summary') {
      if (!lastContent || lastContent.key !== operationKey) return false;

      // Seulement bloquer si EXACTEMENT identique
      const timeDiff = Date.now() - (lastContent.timestamp || 0);
      if (timeDiff > 500) return false; // ✅ 500ms au lieu de temps indéfini

      return JSON.stringify(lastContent.data) === JSON.stringify(operationData);
    }

    return false; // ✅ Permettre les autres opérations
  }, []);

  // 🔧 EXÉCUTION ULTRA-SÉCURISÉE AVEC DIAGNOSTIC
  const safeExecute = useCallback(
    async (operation, operationName, operationKey = null, operationData = null) => {
      // Circuit breaker check
      if (isTemporarilyDisabled.current) {
        console.debug(`LCD disabled - ${operationName} skipped`);
        return false;
      }

      // Si pas connecté, ne pas essayer
      if (!lcdConnected) {
        console.debug(`LCD not connected - ${operationName} skipped`);
        return false;
      }

      // Anti-duplicate
      if (operationKey && isDuplicateOperation(operationKey, operationData)) {
        return false;
      }

      // Vérifier si opération déjà en cours
      if (operationKey && operationQueue.current.has(operationKey)) {
        console.debug(`LCD operation ${operationName} already in progress`);
        return false;
      }

      if (operationKey) {
        operationQueue.current.set(operationKey, true);
      }

      try {
        setLcdLoading(true);
        await operation();

        // Succès - Reset compteur erreurs et mémoriser contenu
        consecutiveErrors.current = 0;
        if (operationKey) {
          lastDisplayedContent.current = {
            key: operationKey,
            data: operationData,
            timestamp: Date.now(),
          };
        }

        // Réinitialiser l'erreur seulement en cas de succès
        if (lcdError && !isTemporarilyDisabled.current) {
          setLcdError(null);
        }

        return true;
      } catch (error) {
        consecutiveErrors.current++;
        const diagnostic = analyzeLCDError(error);

        console.warn(`LCD ${operationName} failed (${consecutiveErrors.current}/3):`, diagnostic);

        // Mise à jour du diagnostic
        setDiagnosticInfo((prev) => ({
          ...prev,
          lastError: {
            operation: operationName,
            time: new Date().toLocaleTimeString('fr-FR'),
            ...diagnostic,
          },
        }));

        // Gestion spécifique selon le type d'erreur
        if (diagnostic.type === 'disconnected') {
          setLcdConnected(false);
          if (!isTemporarilyDisabled.current) {
            setLcdError('LCD déconnecté - Configurez la connexion dans les paramètres');
          }
        } else if (diagnostic.type === 'port_error') {
          setLcdConnected(false);
          if (!isTemporarilyDisabled.current) {
            setLcdError('Problème de port série - Vérifiez la configuration');
          }
        } else if (!isTemporarilyDisabled.current) {
          setLcdError(diagnostic.message + ' - ' + diagnostic.suggestion);
        }

        // Activer circuit breaker si nécessaire
        checkCircuitBreaker();

        return false;
      } finally {
        setLcdLoading(false);
        if (operationKey) {
          operationQueue.current.delete(operationKey);
        }
      }
    },
    [lcdConnected, lcdError, isDuplicateOperation, checkCircuitBreaker, analyzeLCDError]
  );

  // 🔧 FONCTIONS LCD AVEC VALIDATION PRÉALABLE
  const displayCartSummary = useCallback(
    async (itemCount, total) => {
      // Validation des paramètres
      if (typeof itemCount !== 'number' || typeof total !== 'number') {
        console.warn('Invalid parameters for displayCartSummary:', { itemCount, total });
        return false;
      }

      const operationKey = 'cart_summary';
      const operationData = {
        itemCount,
        total: parseFloat(total.toFixed(2)),
      };

      return await safeExecute(
        async () => {
          const line1 = `PANIER (${itemCount})`;
          const line2 = `Total: ${total.toFixed(2)}EUR`;

          await lcdService.writeMessage(line1, line2);
        },
        'affichage résumé panier',
        operationKey,
        operationData
      );
    },
    [safeExecute]
  );

  const displayProductAdded = useCallback(
    async (productName, quantity, unitPrice) => {
      // Validation des paramètres
      if (!productName || typeof quantity !== 'number' || typeof unitPrice !== 'number') {
        console.warn('Invalid parameters for displayProductAdded:', {
          productName,
          quantity,
          unitPrice,
        });
        return false;
      }

      const operationKey = 'product_added';
      const operationData = {
        productName: productName.substring(0, 17),
        quantity,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
      };

      return await safeExecute(
        async () => {
          const formattedName =
            productName.length > 20 ? productName.substring(0, 17) + '...' : productName;
          const line2 = `${quantity}x ${unitPrice.toFixed(2)}EUR`;

          await lcdService.writeMessage(formattedName, line2);
        },
        'affichage produit ajouté',
        operationKey,
        operationData
      );
    },
    [safeExecute]
  );

  const displayWelcome = useCallback(async () => {
    const operationKey = 'welcome';
    const operationData = {};

    return await safeExecute(
      () => lcdService.showWelcome(),
      'affichage bienvenue',
      operationKey,
      operationData
    );
  }, [safeExecute]);

  const displayThankYou = useCallback(async () => {
    const operationKey = 'thankyou';
    const operationData = {};

    return await safeExecute(
      () => lcdService.showThankYou(),
      'affichage remerciement',
      operationKey,
      operationData
    );
  }, [safeExecute]);

  const displayPrice = useCallback(
    async (itemName, price) => {
      const operationKey = 'price';
      const operationData = { itemName, price };

      return await safeExecute(
        () => lcdService.showPrice(itemName, price),
        'affichage prix',
        operationKey,
        operationData
      );
    },
    [safeExecute]
  );

  const displayTotal = useCallback(
    async (total) => {
      const operationKey = 'total';
      const operationData = { total: parseFloat(total.toFixed(2)) };

      return await safeExecute(
        () => lcdService.showTotal(total),
        'affichage total',
        operationKey,
        operationData
      );
    },
    [safeExecute]
  );

  const clearDisplay = useCallback(async () => {
    const operationKey = 'clear';
    const operationData = {};

    lastDisplayedContent.current = null;

    return await safeExecute(
      () => lcdService.clearDisplay(),
      'effacement',
      operationKey,
      operationData
    );
  }, [safeExecute]);

  const displayError = useCallback(
    async (errorMessage) => {
      const operationKey = 'error';
      const operationData = { errorMessage };

      return await safeExecute(
        () => lcdService.showError(errorMessage),
        'affichage erreur',
        operationKey,
        operationData
      );
    },
    [safeExecute]
  );

  // 🔧 FONCTION DE RECONNEXION SIMPLIFIÉE (base votre code)
  const reconnectLCD = useCallback(async () => {
    console.info('🔄 Reconnexion manuelle LCD...');

    // Reset complet de l'état
    isTemporarilyDisabled.current = false;
    consecutiveErrors.current = 0;
    connectionAttempts.current = 0;
    lastDisplayedContent.current = null;
    operationQueue.current.clear();

    setLcdError(null);
    setLcdConnected(false);

    await checkLCDStatus();
  }, [checkLCDStatus]);

  // 🔧 FONCTION DE RESET DU CIRCUIT BREAKER
  const resetCircuitBreaker = useCallback(() => {
    console.info('🟢 Reset manuel du circuit breaker LCD');
    isTemporarilyDisabled.current = false;
    consecutiveErrors.current = 0;
    connectionAttempts.current = 0;
    setLcdError(null);
  }, []);

  return {
    // États principaux
    lcdConnected,
    lcdError,
    lcdLoading,
    diagnosticInfo,

    // Fonctions d'affichage
    displayPrice,
    displayTotal,
    displayWelcome,
    displayThankYou,
    clearDisplay,
    displayError,
    displayProductAdded,
    displayCartSummary,

    // Fonctions de contrôle
    checkLCDStatus,
    reconnectLCD,
    resetCircuitBreaker,

    // État debug (valeurs, pas refs)
    isTemporarilyDisabled: isTemporarilyDisabled.current,
    consecutiveErrors: consecutiveErrors.current,
  };
};

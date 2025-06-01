// src/hooks/useLCD.js
import { useState, useEffect, useCallback, useRef } from 'react';
import lcdService from '../services/lcdService';

export const useLCD = () => {
  // États principaux
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(lcdService.createConnectionState());
  const [scanning, setScanning] = useState(false);
  const [config, setConfig] = useState(lcdService.getDefaultConfig());

  // Référence pour éviter les appels multiples
  const isInitialized = useRef(false);
  const statusInterval = useRef(null);

  // Scan automatique des ports
  const scanPorts = useCallback(async () => {
    setScanning(true);
    try {
      const response = await lcdService.listPorts();
      const availablePorts = response.data?.ports || [];
      setPorts(availablePorts);

      // Auto-sélection du premier port si aucun n'est sélectionné
      if (availablePorts.length > 0 && !selectedPort) {
        setSelectedPort(availablePorts[0].path);
      }

      return availablePorts;
    } catch (error) {
      console.error('Erreur lors du scan des ports:', error);
      setPorts([]);
      return [];
    } finally {
      setScanning(false);
    }
  }, [selectedPort]);

  // Vérification du statut de connexion
  const checkStatus = useCallback(async () => {
    try {
      const response = await lcdService.getStatus();
      const status = response.data?.status;

      if (status) {
        setConnectionStatus((prev) => ({
          ...prev,
          connected: status.connected,
          loading: false,
          error: null,
          port: status.display?.path || null,
          config: status.config || null,
          lastUpdate: status.connected ? new Date().toLocaleTimeString() : prev.lastUpdate,
        }));
      }
    } catch (error) {
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        error: error.message,
        loading: false,
      }));
    }
  }, []);

  // Connexion à l'écran
  const connect = useCallback(
    async (portPath = selectedPort, customConfig = config) => {
      if (!portPath) {
        throw new Error('Aucun port sélectionné');
      }

      // Validation de la configuration
      const configValidation = lcdService.validateConfig(customConfig);
      if (!configValidation.isValid) {
        throw new Error(`Configuration invalide: ${configValidation.errors.join(', ')}`);
      }

      setConnectionStatus((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await lcdService.connect(portPath, customConfig);

        setConnectionStatus((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          error: null,
          port: portPath,
          config: response.data?.connection?.config || customConfig,
          connectionTime: new Date().toLocaleTimeString(),
          messagesCount: 0,
        }));

        return response;
      } catch (error) {
        setConnectionStatus((prev) => ({
          ...prev,
          connected: false,
          loading: false,
          error: error.response?.data?.error || error.message,
          port: null,
          config: null,
        }));
        throw error;
      }
    },
    [selectedPort, config]
  );

  // Déconnexion
  const disconnect = useCallback(async () => {
    try {
      await lcdService.disconnect();
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        loading: false,
        error: null,
        port: null,
        config: null,
        connectionTime: null,
      }));
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // On force la déconnexion côté client même en cas d'erreur
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        loading: false,
        port: null,
        config: null,
        connectionTime: null,
      }));
    }
  }, []);

  // Fonctions de messagerie avec compteur
  const incrementMessageCount = useCallback(() => {
    setConnectionStatus((prev) => ({
      ...prev,
      messagesCount: prev.messagesCount + 1,
      lastUpdate: new Date().toLocaleTimeString(),
    }));
  }, []);

  const writeMessage = useCallback(
    async (line1, line2) => {
      if (!connectionStatus.connected) {
        throw new Error('Écran non connecté');
      }

      const validation = lcdService.validateMessage(line1, line2);
      if (!validation.isValid) {
        throw new Error(`Message invalide: ${validation.errors.join(', ')}`);
      }

      const response = await lcdService.writeMessage(line1, line2);
      incrementMessageCount();
      return response;
    },
    [connectionStatus.connected, incrementMessageCount]
  );

  const clearDisplay = useCallback(async () => {
    if (!connectionStatus.connected) {
      throw new Error('Écran non connecté');
    }

    const response = await lcdService.clearDisplay();
    incrementMessageCount();
    return response;
  }, [connectionStatus.connected, incrementMessageCount]);

  // Messages POS
  const showPrice = useCallback(
    async (itemName, price) => {
      if (!connectionStatus.connected) {
        throw new Error('Écran non connecté');
      }

      const response = await lcdService.showPrice(itemName, price);
      incrementMessageCount();
      return response;
    },
    [connectionStatus.connected, incrementMessageCount]
  );

  const showTotal = useCallback(
    async (total) => {
      if (!connectionStatus.connected) {
        throw new Error('Écran non connecté');
      }

      const response = await lcdService.showTotal(total);
      incrementMessageCount();
      return response;
    },
    [connectionStatus.connected, incrementMessageCount]
  );

  const showWelcome = useCallback(async () => {
    if (!connectionStatus.connected) {
      throw new Error('Écran non connecté');
    }

    const response = await lcdService.showWelcome();
    incrementMessageCount();
    return response;
  }, [connectionStatus.connected, incrementMessageCount]);

  const showThankYou = useCallback(async () => {
    if (!connectionStatus.connected) {
      throw new Error('Écran non connecté');
    }

    const response = await lcdService.showThankYou();
    incrementMessageCount();
    return response;
  }, [connectionStatus.connected, incrementMessageCount]);

  const showError = useCallback(
    async (errorMessage) => {
      if (!connectionStatus.connected) {
        throw new Error('Écran non connecté');
      }

      const response = await lcdService.showError(errorMessage);
      incrementMessageCount();
      return response;
    },
    [connectionStatus.connected, incrementMessageCount]
  );

  const runTest = useCallback(async () => {
    if (!connectionStatus.connected) {
      throw new Error('Écran non connecté');
    }

    const response = await lcdService.runTest();
    setConnectionStatus((prev) => ({
      ...prev,
      messagesCount: prev.messagesCount + 5, // Le test complet envoie 5 messages
      lastUpdate: new Date().toLocaleTimeString(),
    }));
    return response;
  }, [connectionStatus.connected]);

  // Initialisation et nettoyage
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Scan initial des ports et vérification du statut
      scanPorts();
      checkStatus();

      // Vérification périodique du statut
      statusInterval.current = setInterval(checkStatus, 5000);
    }

    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }
    };
  }, [scanPorts, checkStatus]);

  // Mise à jour de la configuration
  const updateConfig = useCallback(
    (newConfig) => {
      const mergedConfig = { ...config, ...newConfig };
      const validation = lcdService.validateConfig(mergedConfig);

      if (!validation.isValid) {
        throw new Error(`Configuration invalide: ${validation.errors.join(', ')}`);
      }

      setConfig(mergedConfig);
    },
    [config]
  );

  // Utilitaires
  const formatText = useCallback((text) => {
    return lcdService.formatText(text);
  }, []);

  const validateMessage = useCallback((line1, line2) => {
    return lcdService.validateMessage(line1, line2);
  }, []);

  return {
    // État
    ports,
    selectedPort,
    connectionStatus,
    scanning,
    config,

    // Actions de base
    scanPorts,
    connect,
    disconnect,
    checkStatus,

    // Configuration
    setSelectedPort,
    updateConfig,

    // Messages
    writeMessage,
    clearDisplay,

    // Messages POS
    showPrice,
    showTotal,
    showWelcome,
    showThankYou,
    showError,
    runTest,

    // Utilitaires
    formatText,
    validateMessage,

    // État dérivé
    isConnected: connectionStatus.connected,
    isLoading: connectionStatus.loading || scanning,
    hasError: !!connectionStatus.error,
  };
};

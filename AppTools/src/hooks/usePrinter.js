// src/hooks/usePrinter.js
import { useState, useEffect, useCallback, useRef } from 'react';
import printerService from '../services/printerService';

export const usePrinter = () => {
  // États principaux
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(printerService.createConnectionState());
  const [scanning, setScanning] = useState(false);
  const [config, setConfig] = useState(printerService.getDefaultConfig());

  // Référence pour éviter les appels multiples
  const isInitialized = useRef(false);
  const statusInterval = useRef(null);

  // Scan automatique des imprimantes
  const scanPrinters = useCallback(async () => {
    setScanning(true);
    try {
      const response = await printerService.listPrinters();
      const availablePrinters = response.data?.ports || [];
      setPrinters(availablePrinters);

      // Auto-sélection de la première imprimante POS si aucune n'est sélectionnée
      if (availablePrinters.length > 0 && !selectedPrinter) {
        const bestPrinter =
          availablePrinters.find((p) => p.posProbability > 70) || availablePrinters[0];
        setSelectedPrinter(bestPrinter.name);
      }

      return availablePrinters;
    } catch (error) {
      console.error('Erreur lors du scan des imprimantes:', error);
      setPrinters([]);
      return [];
    } finally {
      setScanning(false);
    }
  }, [selectedPrinter]);

  // Vérification du statut de connexion
  const checkStatus = useCallback(async () => {
    try {
      const response = await printerService.getStatus();
      const status = response.data?.status;

      if (status) {
        setConnectionStatus((prev) => ({
          ...prev,
          connected: status.connected,
          loading: false,
          error: null,
          printer: status.printer?.name || null,
          method: status.printer?.method || null,
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

  // Connexion à l'imprimante
  const connect = useCallback(
    async (printerName = selectedPrinter, customConfig = config) => {
      if (!printerName) {
        throw new Error('Aucune imprimante sélectionnée');
      }

      // Validation de la configuration
      const configValidation = printerService.validateConfig(customConfig);
      if (!configValidation.isValid) {
        throw new Error(`Configuration invalide: ${configValidation.errors.join(', ')}`);
      }

      setConnectionStatus((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await printerService.connect(printerName, customConfig);

        setConnectionStatus((prev) => ({
          ...prev,
          connected: true,
          loading: false,
          error: null,
          printer: printerName,
          method: response.data?.method || 'powershell_dotnet',
          config: response.data?.config || customConfig,
          connectionTime: new Date().toLocaleTimeString(),
          printCount: 0,
        }));

        return response;
      } catch (error) {
        setConnectionStatus((prev) => ({
          ...prev,
          connected: false,
          loading: false,
          error: error.response?.data?.error || error.message,
          printer: null,
          method: null,
          config: null,
        }));
        throw error;
      }
    },
    [selectedPrinter, config]
  );

  // Déconnexion
  const disconnect = useCallback(async () => {
    try {
      await printerService.disconnect();
      setConnectionStatus((prev) => ({
        ...prev,
        connected: false,
        loading: false,
        error: null,
        printer: null,
        method: null,
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
        printer: null,
        method: null,
        config: null,
        connectionTime: null,
      }));
    }
  }, []);

  // Fonctions d'impression avec compteur
  const incrementPrintCount = useCallback(() => {
    setConnectionStatus((prev) => ({
      ...prev,
      printCount: prev.printCount + 1,
      lastPrint: new Date().toLocaleTimeString(),
    }));
  }, []);

  const printText = useCallback(
    async (text, options = {}) => {
      if (!connectionStatus.connected) {
        throw new Error('Imprimante non connectée');
      }

      const validation = printerService.validateText(text);
      if (!validation.isValid) {
        throw new Error(`Texte invalide: ${validation.errors.join(', ')}`);
      }

      const response = await printerService.printText(text, options);
      incrementPrintCount();
      return response;
    },
    [connectionStatus.connected, incrementPrintCount]
  );

  const printLine = useCallback(
    async (leftText, rightText, separator = '.') => {
      if (!connectionStatus.connected) {
        throw new Error('Imprimante non connectée');
      }

      const response = await printerService.printLine(leftText, rightText, separator);
      incrementPrintCount();
      return response;
    },
    [connectionStatus.connected, incrementPrintCount]
  );

  const printReceipt = useCallback(
    async (items, options = {}) => {
      if (!connectionStatus.connected) {
        throw new Error('Imprimante non connectée');
      }

      const validation = printerService.validateReceipt(items);
      if (!validation.isValid) {
        throw new Error(`Ticket invalide: ${validation.errors.join(', ')}`);
      }

      const response = await printerService.printReceipt(items, options);
      incrementPrintCount();
      return response;
    },
    [connectionStatus.connected, incrementPrintCount]
  );

  const cutPaper = useCallback(
    async (fullCut = false) => {
      if (!connectionStatus.connected) {
        throw new Error('Imprimante non connectée');
      }

      const response = await printerService.cutPaper(fullCut);
      incrementPrintCount();
      return response;
    },
    [connectionStatus.connected, incrementPrintCount]
  );

  const feedPaper = useCallback(
    async (lines = 3) => {
      if (!connectionStatus.connected) {
        throw new Error('Imprimante non connectée');
      }

      const response = await printerService.feedPaper(lines);
      incrementPrintCount();
      return response;
    },
    [connectionStatus.connected, incrementPrintCount]
  );

  const testPrinter = useCallback(async () => {
    if (!connectionStatus.connected) {
      throw new Error('Imprimante non connectée');
    }

    const response = await printerService.testPrinter();
    setConnectionStatus((prev) => ({
      ...prev,
      printCount: prev.printCount + 3, // Le test complet envoie plusieurs impressions
      lastPrint: new Date().toLocaleTimeString(),
    }));
    return response;
  }, [connectionStatus.connected]);

  // Test des capacités PowerShell
  const testCapabilities = useCallback(async () => {
    try {
      const response = await printerService.testCapabilities();
      return response.data;
    } catch (error) {
      console.error('Erreur test de capacités:', error);
      return {
        powerShellDotNet: false,
        capabilities: ['basic_printing'],
        error: error.message,
      };
    }
  }, []);

  // Initialisation et nettoyage
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;

      // Scan initial des imprimantes et vérification du statut
      scanPrinters();
      checkStatus();

      // Vérification périodique du statut
      statusInterval.current = setInterval(checkStatus, 10000); // 10 secondes
    }

    return () => {
      if (statusInterval.current) {
        clearInterval(statusInterval.current);
        statusInterval.current = null;
      }
    };
  }, [scanPrinters, checkStatus]);

  // Mise à jour de la configuration
  const updateConfig = useCallback(
    (newConfig) => {
      const mergedConfig = { ...config, ...newConfig };
      const validation = printerService.validateConfig(mergedConfig);

      if (!validation.isValid) {
        throw new Error(`Configuration invalide: ${validation.errors.join(', ')}`);
      }

      setConfig(mergedConfig);
    },
    [config]
  );

  // Utilitaires
  const formatText = useCallback((text) => {
    return printerService.formatText(text);
  }, []);

  const validateText = useCallback((text) => {
    return printerService.validateText(text);
  }, []);

  const validateReceipt = useCallback((items) => {
    return printerService.validateReceipt(items);
  }, []);

  return {
    // État
    printers,
    selectedPrinter,
    connectionStatus,
    scanning,
    config,

    // Actions de base
    scanPrinters,
    connect,
    disconnect,
    checkStatus,

    // Configuration
    setSelectedPrinter,
    updateConfig,

    // Impression
    printText,
    printLine,
    printReceipt,

    // Contrôles papier
    cutPaper,
    feedPaper,

    // Tests
    testPrinter,
    testCapabilities,

    // Utilitaires
    formatText,
    validateText,
    validateReceipt,

    // État dérivé
    isConnected: connectionStatus.connected,
    isLoading: connectionStatus.loading || scanning,
    hasError: !!connectionStatus.error,
  };
};

// src/components/ApiTest.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import apiConfigService from '../services/apiConfig';
import { themeManager } from '../utils/themeManager';

const ApiTest = () => {
  const [status, setStatus] = useState('Initialisation...');
  const [apiInfo, setApiInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const initApi = async () => {
    try {
      setStatus('Connexion au serveur API...');
      setError(null);

      await apiService.init();

      const baseUrl = apiConfigService.getBaseUrl();
      setApiInfo({
        baseUrl,
        usingProxy: baseUrl === '',
      });

      const result = await apiService.testConnection();
      setTestResult(result);

      // Vérifier si c'est une erreur réseau
      if (result && !result.success && result.isNetworkError) {
        setStatus('Serveur indisponible');
        setError({
          type: 'network',
          message: result.error,
          baseURL: result.baseURL,
        });
      } else {
        setStatus('Connecté');
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'API:", error);
      setError({
        type: 'unknown',
        message: error.message,
      });
      setStatus('Erreur de connexion');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await initApi();
    setIsRetrying(false);
  };

  useEffect(() => {
    themeManager.initTheme();
    initApi();
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'Connecté':
        return {
          class: 'text-green-600',
          bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
        };
      case 'Serveur indisponible':
        return {
          class: 'text-red-600',
          bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        };
      case 'Erreur de connexion':
        return {
          class: 'text-red-600',
          bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        };
      default:
        return {
          class: 'text-orange-600',
          bgClass: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="p-5 border rounded-lg shadow-sm my-5 bg-white dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Test de connexion API
      </h2>

      <div className={`mb-4 p-3 rounded-lg border ${statusConfig.bgClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <strong className="text-gray-800 dark:text-gray-200">Statut : </strong>
            <span className={`font-semibold ${statusConfig.class}`}>{status}</span>
          </div>

          {(status === 'Serveur indisponible' || status === 'Erreur de connexion') && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Test...' : 'Réessayer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerte serveur indisponible */}
      {error?.type === 'network' && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-red-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                Serveur indisponible
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-2">
                Le serveur API n'est pas accessible à l'adresse{' '}
                <code className="bg-red-100 dark:bg-red-800 px-1 py-0.5 rounded text-xs">
                  {error.baseURL}
                </code>
              </p>
              <p className="text-red-700 dark:text-red-300 font-medium">
                Veuillez relancer AppPos et réessayer
              </p>
            </div>
          </div>
        </div>
      )}

      {apiInfo && (
        <div className="mb-3 text-gray-800 dark:text-gray-200">
          <h3 className="font-semibold mb-2">Information de connexion</h3>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm">
            <p className="mb-1">
              <strong>URL de base :</strong> {apiInfo.baseUrl || 'Utilisation du proxy Vite'}
            </p>
            <p>
              <strong>Mode :</strong> {apiInfo.usingProxy ? 'Via proxy' : 'Connexion directe'}
            </p>
          </div>
        </div>
      )}

      {testResult && (
        <div className="mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Résultat du test</h3>
          <details className="bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
            <summary className="p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
              Voir les détails techniques
            </summary>
            <pre className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {error?.type === 'unknown' && (
        <div className="mb-3 text-red-600">
          <h3 className="font-semibold">Erreur</h3>
          <p>{error.message}</p>
        </div>
      )}
    </div>
  );
};

export default ApiTest;

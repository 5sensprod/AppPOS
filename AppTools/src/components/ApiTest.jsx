// src/components/ApiTest.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import apiConfigService from '../services/apiConfig';
import { themeManager } from '../utils/themeManager';

const ApiTest = () => {
  const [status, setStatus] = useState('Initialisation...');
  const [apiInfo, setApiInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    themeManager.initTheme();

    const initApi = async () => {
      try {
        setStatus('Connexion au serveur API...');

        await apiService.init();

        const baseUrl = apiConfigService.getBaseUrl();
        setApiInfo({
          baseUrl,
          usingProxy: baseUrl === '',
        });

        const result = await apiService.testConnection();
        setTestResult(result);
        setStatus('Connecté');
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'API:", error);
        setError(error.message);
        setStatus('Erreur de connexion');
      }
    };

    initApi();
  }, []);

  const statusClass =
    {
      Connecté: 'text-green-600',
      'Erreur de connexion': 'text-red-600',
    }[status] || 'text-orange-600';

  return (
    <div className="p-5 border rounded-lg shadow-sm my-5 bg-white dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        Test de connexion API
      </h2>

      <div className="mb-3 text-gray-800 dark:text-gray-200">
        <strong>Statut : </strong>
        <span className={`font-semibold ${statusClass}`}>{status}</span>
      </div>

      {apiInfo && (
        <div className="mb-3 text-gray-800 dark:text-gray-200">
          <h3 className="font-semibold">Information de connexion</h3>
          <p>
            <strong>URL de base :</strong> {apiInfo.baseUrl || 'Utilisation du proxy Vite'}
          </p>
          <p>
            <strong>Mode :</strong> {apiInfo.usingProxy ? 'Via proxy' : 'Connexion directe'}
          </p>
        </div>
      )}

      {testResult && (
        <div className="mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Résultat du test</h3>
          <pre className="bg-gray-100 dark:bg-gray-900 dark:text-gray-200 p-3 rounded overflow-auto text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mb-3 text-red-600">
          <h3 className="font-semibold">Erreur</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default ApiTest;

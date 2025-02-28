// src/components/ApiTest.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import apiConfigService from '../services/apiConfig';

const ApiTest = () => {
  const [status, setStatus] = useState('Initialisation...');
  const [apiInfo, setApiInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initApi = async () => {
      try {
        setStatus('Connexion au serveur API...');

        // Initialiser le service API
        await apiService.init();

        // Récupérer les infos de l'API
        const baseUrl = apiConfigService.getBaseUrl();
        setApiInfo({
          baseUrl,
          usingProxy: baseUrl === '',
        });

        // Tester la connexion
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

  return (
    <div className="api-test">
      <h2>Test de connexion API</h2>

      <div className="status">
        <strong>Statut:</strong>
        <span
          className={
            status === 'Connecté'
              ? 'success'
              : status === 'Erreur de connexion'
                ? 'error'
                : 'pending'
          }
        >
          {status}
        </span>
      </div>

      {apiInfo && (
        <div className="api-info">
          <h3>Information de connexion</h3>
          <p>
            <strong>URL de base:</strong> {apiInfo.baseUrl || 'Utilisation du proxy Vite'}
          </p>
          <p>
            <strong>Mode:</strong> {apiInfo.usingProxy ? 'Via proxy' : 'Connexion directe'}
          </p>
        </div>
      )}

      {testResult && (
        <div className="test-result">
          <h3>Résultat du test</h3>
          <pre>{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div className="error-message">
          <h3>Erreur</h3>
          <p>{error}</p>
        </div>
      )}

      <style jsx>{`
        .api-test {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 5px;
          margin: 20px 0;
        }
        .success {
          color: green;
        }
        .error {
          color: red;
        }
        .pending {
          color: orange;
        }
        .test-result pre {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 3px;
          overflow: auto;
        }
      `}</style>
    </div>
  );
};

export default ApiTest;

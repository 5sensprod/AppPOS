// src/components/Bonjour.jsx
import React, { useState } from 'react';
import axios from 'axios';

const Bonjour = () => {
  const [message, setMessage] = useState('Bonjour');
  const [apiStatus, setApiStatus] = useState('Non connecté');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);

  // Test de connexion via proxy à /test
  const testTestRouteProxy = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      console.log('Tentative de connexion à /test via proxy...');
      const response = await axios.get('/test');
      console.log('Réponse reçue:', response);
      setApiStatus(`Connecté! ${response.data.message}`);
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError(`Erreur: ${err.message}`);
      setApiStatus('Échec de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Connexion directe à la racine de l'API
  const testRootDirect = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      console.log("Connexion directe à la racine de l'API...");
      const response = await axios.get('http://localhost:3000/');
      console.log('Réponse reçue:', response);
      setApiStatus(`Connecté à l'API racine! ${response.data.message}`);
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Erreur de connexion directe:', err);
      setError(`Erreur: ${err.message}`);
      setApiStatus('Échec de connexion directe');
    } finally {
      setLoading(false);
    }
  };

  // Test avec un proxy personnalisé pour la racine de l'API
  const testRootCustomProxy = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      console.log("Tentative de connexion à la racine de l'API via proxy personnalisé...");

      // Création d'une instance Axios avec une URL de base
      const apiInstance = axios.create({
        baseURL: 'http://localhost:3000',
        timeout: 5000,
        headers: {
          Accept: 'application/json',
        },
      });

      const response = await apiInstance.get('/');
      console.log('Réponse reçue:', response);
      setApiStatus(`Connecté à l'API racine! ${response.data.message}`);
      setApiResponse(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Erreur de connexion proxy personnalisé:', err);
      setError(`Erreur: ${err.message}`);
      setApiStatus("Échec de connexion à l'API racine");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>{message}</h1>

      <div style={{ marginBottom: '20px' }}>
        <p>
          Statut de l'API: <strong>{apiStatus}</strong>
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={testTestRouteProxy}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Tester /test (proxy)'}
          </button>

          <button
            onClick={testRootCustomProxy}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Tester racine API (proxy)'}
          </button>

          <button
            onClick={testRootDirect}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion...' : 'Connexion directe'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#ffebee',
              border: '1px solid #ffcdd2',
              borderRadius: '4px',
              marginBottom: '15px',
            }}
          >
            <p style={{ color: '#c62828', fontWeight: 'bold', marginTop: 0 }}>
              Erreur de connexion:
            </p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {error}
            </pre>
          </div>
        )}

        {apiResponse && (
          <div
            style={{
              padding: '10px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #c8e6c9',
              borderRadius: '4px',
            }}
          >
            <p style={{ color: '#2e7d32', fontWeight: 'bold', marginTop: 0 }}>Réponse de l'API:</p>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              {apiResponse}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bonjour;

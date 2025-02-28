// src/services/api.js
import axios from 'axios';

// Création d'une instance axios avec une configuration par défaut
const api = axios.create({
  // En utilisant le proxy de Vite, nous pouvons utiliser des chemins relatifs
  // au lieu de l'URL complète, ce qui évite les problèmes CORS
  baseURL: '/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    // Vous pouvez ajouter ici un token d'authentification si nécessaire
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    console.log('Requête API:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Erreur de requête API:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    console.log('Réponse API reçue:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // Gestion des erreurs de réponse
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      console.error('Erreur API:', error.response.status, error.response.data);
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Pas de réponse du serveur:', error.request);
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur de configuration de la requête:', error.message);
    }
    return Promise.reject(error);
  }
);

// Méthodes d'API simplifiées
const apiService = {
  // Tester la connexion à l'API
  testConnection: () => api.get('/test'),

  // Accéder à la page d'accueil de l'API
  getHomePage: () => api.get('/'),

  // Méthodes génériques
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Méthodes spécifiques pour les entités de votre API
  // Exemple:
  // getProducts: () => api.get('/api/products'),
  // createProduct: (productData) => api.post('/api/products', productData),
};

export default apiService;

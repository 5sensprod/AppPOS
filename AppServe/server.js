// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const { getLocalIpAddress } = require('./utils/network');
// Importer les utilitaires
const { setupServer } = require('./utils/server-setup');
const { authMiddleware } = require('./utils/auth');
// Créer l'application Express
const app = express();
const defaultPort = process.env.PORT || 3000;

// Configuration CORS améliorée
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Important: permet l'envoi de cookies et headers d'authentification
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Fichiers statiques
app.use('/public', express.static(path.resolve(__dirname, 'public')));

// Routes d'authentification (non protégées)
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Routes API (protégées par authentification)
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const brandRoutes = require('./routes/brandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const wooSyncRoutes = require('./routes/wooSyncRoutes');

// Protection des routes API avec le middleware d'authentification
app.use('/api/categories', authMiddleware, categoryRoutes);
app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/brands', authMiddleware, brandRoutes);
app.use('/api/suppliers', authMiddleware, supplierRoutes);
app.use('/api/sync', authMiddleware, wooSyncRoutes);

// Ajouter cette route avant le démarrage du serveur
app.get('/api/server-info', (req, res) => {
  const ipAddress = getLocalIpAddress();
  const port = req.socket.localPort; // Obtient le port sur lequel la requête est reçue
  res.json({
    ip: ipAddress,
    port: port,
    url: `http://${ipAddress}:${port}`,
  });
});

// Route de test (non protégée)
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

// Route principale (non protégée)
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

// Démarrer le serveur
setupServer(app, defaultPort).catch((error) => {
  console.error('Impossible de démarrer le serveur:', error.message);
  process.exit(1);
});

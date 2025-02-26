// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Importer les utilitaires
const { setupServer } = require('./utils/server-setup');

// Créer l'application Express
const app = express();
const defaultPort = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Fichiers statiques
app.use('/public', express.static(path.resolve(__dirname, 'public')));

// Routes
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const brandRoutes = require('./routes/brandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const wooSyncRoutes = require('./routes/wooSyncRoutes');

// Configurer les routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sync', wooSyncRoutes);

// Route de test
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

// Route principale
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

// Démarrer le serveur
setupServer(app, defaultPort).catch((error) => {
  console.error('Impossible de démarrer le serveur:', error.message);
  process.exit(1);
});

// server.js
const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
require('dotenv').config();

// Middleware
app.use(express.json());

// Fichiers statiques (ex: images des catégories, produits, etc.)
app.use('/public', express.static(path.resolve(__dirname, 'public')));

// Routes
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const brandRoutes = require('./routes/brandRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const syncRoutes = require('./routes/syncRoutes');

app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/sync', syncRoutes);

// Route de test
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

// Route principale
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

// const express = require('express');
//     const sqlite3 = require('sqlite3').verbose();
//     const bodyParser = require('body-parser');
//     const cors = require('cors');

//     const app = express();
//     const port = 3000;

//     app.use(cors());
//     app.use(bodyParser.json());

//     // Routes API
//     const products = require('./api/products');
//     const sales = require('./api/sales');
//     const users = require('./api/users');
//     const wooSync = require('./api/wooSync');

//     app.use('/api/products', products);
//     app.use('/api/sales', sales);
//     app.use('/api/users', users);
//     app.use('/api/sync', wooSync);

//     // Gestion des périphériques
//     const printer = require('./peripherals/printer');
//     const scanner = require('./peripherals/scanner');
//     const display = require('./peripherals/display');

//     app.use('/api/print', printer);
//     app.use('/api/scanner', scanner);
//     app.use('/api/lcd', display);

//     app.listen(port, () => {
//       console.log(`Server running at http://localhost:${port}/`);
//     });

const express = require('express');
const app = express();
const port = 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Route de test
app.get('/test', (req, res) => {
  res.json({ message: 'Le serveur fonctionne correctement !' });
});

// Route principale
app.get('/', (req, res) => {
  res.json({ message: "Bienvenue sur l'API POS" });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

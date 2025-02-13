// AppServe\tests\setupTests.js
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.DB_CONNECTION = 'memory';

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });

  // Créer des fichiers DB vides
  ['categories', 'products', 'brands', 'suppliers'].forEach((db) => {
    fs.writeFileSync(path.join(dataDir, `${db}.db`), '');
  });
}

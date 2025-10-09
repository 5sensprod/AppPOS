// models/User.js - Instance unique de la DB users
const Datastore = require('nedb');
const pathManager = require('../utils/PathManager');
const path = require('path');

// ✅ INSTANCE UNIQUE - Export direct
const usersDb = new Datastore({
  filename: path.join(pathManager.getDataPath(), 'users.db'),
  autoload: true,
});

// Créer les index une seule fois
usersDb.ensureIndex({ fieldName: 'username', unique: true });
usersDb.ensureIndex({ fieldName: 'role' });

console.log('✅ [USER DB] Base de données users initialisée');

module.exports = usersDb;

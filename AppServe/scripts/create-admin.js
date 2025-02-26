// scripts/create-admin.js
require('dotenv').config({ path: '../.env' });
const { register } = require('../utils/auth');

// Configuration de l'utilisateur admin par défaut
const DEFAULT_ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  role: 'admin',
};

async function createDefaultAdmin() {
  try {
    console.log("Tentative de création de l'utilisateur administrateur par défaut...");

    const result = await register(DEFAULT_ADMIN);

    if (result.success) {
      console.log('✅ Utilisateur administrateur créé avec succès:', result.user.username);
    } else {
      console.log('ℹ️ Note:', result.message);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la création de l'administrateur:", error.message);
  }
}

// Exécuter la fonction
createDefaultAdmin()
  .then(() => {
    console.log('Script terminé');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });

// utils/categoryHelpers.js
const db = require('../config/database');

async function calculateLevel(parent_id) {
  if (!parent_id) return 0;

  try {
    const parent = await new Promise((resolve, reject) => {
      db.categories.findOne({ _id: parent_id }, (err, doc) => {
        if (err) {
          console.error(`Erreur récupération parent (${parent_id}):`, err);
          resolve(null); // Évite le plantage en cas d'erreur DB
        }
        resolve(doc);
      });
    });

    return parent ? (parent.level || 0) + 1 : 0;
  } catch (error) {
    console.error('Erreur dans calculateLevel:', error);
    return 0; // Retourne 0 en cas d’erreur
  }
}

module.exports = { calculateLevel };

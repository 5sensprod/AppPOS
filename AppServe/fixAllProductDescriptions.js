// fixAllProductDescriptions.js

/**
 * Script pour corriger toutes les descriptions HTML existantes dans la base de données
 * Utilisation: node fixAllProductDescriptions.js
 */

// Chargement des variables d'environnement
require('dotenv').config();

// Imports nécessaires
const db = require('./config/database');
const htmlCleanerService = require('./services/HtmlCleanerService');
const Product = require('./models/Product');

// Fonction principale
async function fixAllDescriptions() {
  console.log('Démarrage du processus de correction des descriptions HTML...');

  try {
    // Se connecter à la base de données si nécessaire
    if (typeof db.connect === 'function') {
      await db.connect();
      console.log('Connecté à la base de données');
    } else {
      console.log('Connexion à la base de données déjà établie');
    }

    // Obtenir tous les produits
    const products = await Product.findAll();
    console.log(`${products.length} produits trouvés`);

    // Initialiser les compteurs
    let correctedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;
    let noDescriptionCount = 0;
    const errors = [];

    // Traiter chaque produit
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Afficher la progression
      if (i % 10 === 0 || i === products.length - 1) {
        console.log(`Traitement du produit ${i + 1}/${products.length}...`);
      }

      // Vérifier si le produit a une description
      if (!product.description) {
        noDescriptionCount++;
        continue;
      }

      try {
        // Nettoyer la description HTML
        const originalDescription = product.description;
        const cleanedDescription = htmlCleanerService.cleanHtmlDescription(originalDescription);

        // Vérifier si la description a été modifiée
        if (cleanedDescription === originalDescription) {
          unchangedCount++;
          continue;
        }

        // Mettre à jour le produit avec la description nettoyée
        await Product.update(product._id, {
          ...product,
          description: cleanedDescription,
        });

        // Incrémenter le compteur
        correctedCount++;

        // Log détaillé pour les 5 premiers produits corrigés
        if (correctedCount <= 5) {
          console.log(`\nProduit corrigé: ${product.name || product._id}`);
          console.log(`  - Longueur originale: ${originalDescription.length} caractères`);
          console.log(`  - Longueur après nettoyage: ${cleanedDescription.length} caractères`);
          console.log(
            `  - Différence: ${cleanedDescription.length - originalDescription.length} caractères`
          );
        }
      } catch (error) {
        console.error(
          `Erreur lors de la correction de la description du produit ${product._id}:`,
          error.message
        );
        errorCount++;
        errors.push({
          id: product._id,
          name: product.name,
          error: error.message,
        });
      }
    }

    // Afficher le résumé
    console.log('\n--- RÉSUMÉ ---');
    console.log(`Total produits traités: ${products.length}`);
    console.log(`Produits sans description: ${noDescriptionCount}`);
    console.log(`Descriptions corrigées: ${correctedCount}`);
    console.log(`Descriptions inchangées: ${unchangedCount}`);
    console.log(`Erreurs rencontrées: ${errorCount}`);

    // Afficher les détails des erreurs si nécessaire
    if (errorCount > 0) {
      console.log('\n--- DÉTAILS DES ERREURS ---');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. Produit: ${err.name || err.id}`);
        console.log(`   Erreur: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Erreur lors du processus de correction:', error);
  } finally {
    // Fermer la connexion à la base de données si nécessaire
    if (typeof db.close === 'function') {
      await db.close();
      console.log('Connexion à la base de données fermée');
    }

    console.log('Processus terminé');
  }
}

// Demander confirmation avant de commencer
console.log(
  'Ce script va corriger toutes les descriptions HTML de tous les produits dans la base de données.'
);
console.log('Voulez-vous continuer? (y/n)');

process.stdin.once('data', (data) => {
  const answer = data.toString().trim().toLowerCase();

  if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
    // Exécuter la fonction principale
    fixAllDescriptions().catch(console.error);
  } else {
    console.log('Opération annulée');
    process.exit(0);
  }
});

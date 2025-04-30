// fixSingleProductDescription.js

/**
 * Script pour corriger la description HTML d'un seul produit
 * Utilisation: node fixSingleProductDescription.js <product_id>
 */

// Chargement des variables d'environnement
require('dotenv').config();

// Imports nécessaires
const db = require('./config/database');
const htmlCleanerService = require('./services/HtmlCleanerService');
const Product = require('./models/Product');

// Fonction principale
async function fixSingleDescription(productId) {
  if (!productId) {
    console.error('Erreur: Veuillez fournir un ID de produit');
    console.log('Usage: node fixSingleProductDescription.js <product_id>');
    process.exit(1);
  }

  console.log(`Démarrage de la correction pour le produit ID: ${productId}`);

  try {
    // Se connecter à la base de données si nécessaire
    if (typeof db.connect === 'function') {
      await db.connect();
      console.log('Connecté à la base de données');
    } else {
      console.log('Connexion à la base de données déjà établie');
    }

    // Obtenir le produit directement avec votre modèle Product
    const product = await Product.findById(productId);

    if (!product) {
      console.error(`Erreur: Produit avec ID ${productId} non trouvé`);
      process.exit(1);
    }

    console.log(`Produit trouvé: ${product.name || 'Sans nom'}`);

    // Vérifier si le produit a une description
    if (!product.description) {
      console.log("Ce produit n'a pas de description HTML à corriger");
      process.exit(0);
    }

    // Afficher un extrait de la description originale
    console.log('\nDescription originale (extrait):');
    console.log(product.description.substring(0, 200) + '...');
    console.log(`Longueur totale: ${product.description.length} caractères`);

    // Nettoyer la description HTML
    const cleanedDescription = htmlCleanerService.cleanHtmlDescription(product.description);

    // Vérifier si la description a été modifiée
    if (cleanedDescription === product.description) {
      console.log('\nLa description ne nécessite pas de correction');
      process.exit(0);
    }

    // Afficher un extrait de la description nettoyée
    console.log('\nDescription nettoyée (extrait):');
    console.log(cleanedDescription.substring(0, 200) + '...');
    console.log(`Longueur totale: ${cleanedDescription.length} caractères`);

    // Demander confirmation avant de mettre à jour
    console.log('\nVoulez-vous mettre à jour la description? (y/n)');
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();

      if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
        // Mettre à jour le produit avec la description nettoyée
        await Product.update(productId, {
          ...product,
          description: cleanedDescription,
        });

        console.log('Description mise à jour avec succès!');
      } else {
        console.log('Opération annulée');
      }

      // Fermer la connexion à la base de données si nécessaire
      if (typeof db.close === 'function') {
        await db.close();
      }

      process.exit(0);
    });
  } catch (error) {
    console.error('Erreur lors du processus de correction:', error);
    process.exit(1);
  }
}

// Récupérer l'ID du produit depuis les arguments de ligne de commande
const productId = process.argv[2];

// Exécuter la fonction principale
fixSingleDescription(productId).catch((error) => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});

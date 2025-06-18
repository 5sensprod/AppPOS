#!/usr/bin/env node
// scripts/count-prestation-products-fixed.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration des chemins
const NEW_DB_PATH = path.join(__dirname, '../data/products.db');
const CATEGORIES_DB_PATH = path.join(__dirname, '../data/categories.db'); // Ajouter le fichier catégories

console.log('🔍 [COMPTAGE] Produits avec catégorie parent "PRESTATION"');

// ID de la catégorie PRESTATION
const PRESTATION_CATEGORY_ID = 'RMDigYsxjM7GooEg';

async function loadCategories() {
  try {
    if (!fs.existsSync(CATEGORIES_DB_PATH)) {
      console.error(`❌ Fichier catégories non trouvé: ${CATEGORIES_DB_PATH}`);
      return null;
    }

    const categoriesDb = new Datastore({ filename: CATEGORIES_DB_PATH, autoload: true });

    const categories = await new Promise((resolve, reject) => {
      categoriesDb.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    return categories;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des catégories:', error);
    return null;
  }
}

async function countPrestationProducts() {
  try {
    // Charger les catégories
    console.log('📂 Chargement des catégories...');
    const categories = await loadCategories();

    if (!categories) {
      console.log(
        '⚠️  Impossible de charger les catégories, utilisation de la méthode alternative...'
      );
      // Fallback: chercher directement dans les produits
      return countByProductsOnly();
    }

    console.log(`📊 ${categories.length} catégories chargées`);

    // Trouver toutes les sous-catégories de PRESTATION
    const prestationSubCategories = categories.filter(
      (cat) => cat.parent_id === PRESTATION_CATEGORY_ID
    );

    console.log(`🎯 Sous-catégories de PRESTATION trouvées: ${prestationSubCategories.length}`);
    prestationSubCategories.forEach((cat) => {
      console.log(`  - ${cat.name} (${cat._id})`);
    });

    const prestationCategoryIds = prestationSubCategories.map((cat) => cat._id);
    // Ajouter aussi l'ID principal de PRESTATION au cas où
    prestationCategoryIds.push(PRESTATION_CATEGORY_ID);

    // Charger les produits
    if (!fs.existsSync(NEW_DB_PATH)) {
      console.error(`❌ Base de données produits non trouvée: ${NEW_DB_PATH}`);
      process.exit(1);
    }

    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📦 ${products.length} produits chargés`);

    // Filtrer les produits qui appartiennent aux catégories PRESTATION
    const prestationProducts = products.filter((product) => {
      // Vérifier category_id
      if (product.category_id && prestationCategoryIds.includes(product.category_id)) {
        return true;
      }

      // Vérifier dans le tableau categories
      if (product.categories && Array.isArray(product.categories)) {
        return product.categories.some((catId) => prestationCategoryIds.includes(catId));
      }

      return false;
    });

    console.log(`\n📊 [RÉSULTATS]`);
    console.log(`🎯 Produits de PRESTATION trouvés: ${prestationProducts.length}`);

    if (prestationProducts.length > 0) {
      console.log('\n✅ [LISTE DES PRESTATIONS]:');

      prestationProducts.forEach((product, index) => {
        // Trouver le nom de la catégorie
        const categoryId = product.category_id || (product.categories && product.categories[0]);
        const category = categories.find((cat) => cat._id === categoryId);
        const categoryName = category ? category.name : 'Catégorie inconnue';

        console.log(`${index + 1}. ${product.name}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Prix: ${product.price}€`);
        console.log(`   Catégorie: ${categoryName}`);
        console.log(`   ID Catégorie: ${categoryId}`);
        console.log('');
      });

      // Statistiques
      const totalValue = prestationProducts.reduce((sum, p) => sum + (p.price || 0), 0);
      const averagePrice = totalValue / prestationProducts.length;

      console.log(`💰 Valeur totale des prestations: ${totalValue.toFixed(2)}€`);
      console.log(`📈 Prix moyen: ${averagePrice.toFixed(2)}€`);

      // Grouper par catégorie
      const byCategory = {};
      prestationProducts.forEach((product) => {
        const categoryId = product.category_id || (product.categories && product.categories[0]);
        const category = categories.find((cat) => cat._id === categoryId);
        const categoryName = category ? category.name : 'Inconnue';

        if (!byCategory[categoryName]) {
          byCategory[categoryName] = [];
        }
        byCategory[categoryName].push(product);
      });

      console.log('\n📋 [RÉPARTITION PAR CATÉGORIE]:');
      Object.keys(byCategory)
        .sort()
        .forEach((catName) => {
          console.log(`  ${catName}: ${byCategory[catName].length} produits`);
        });
    } else {
      console.log('\n❌ Aucun produit de prestation trouvé');

      // Debug: vérifier quelques produits
      console.log('\n🔍 [DEBUG] Vérification de quelques produits:');
      products.slice(0, 5).forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   category_id: ${product.category_id}`);
        console.log(`   categories: ${JSON.stringify(product.categories)}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Méthode alternative si pas de fichier catégories
async function countByProductsOnly() {
  try {
    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    // Chercher les produits avec PRESTATION_CATEGORY_ID
    const prestationProducts = products.filter((product) => {
      if (product.category_id === PRESTATION_CATEGORY_ID) return true;
      if (product.categories && product.categories.includes(PRESTATION_CATEGORY_ID)) return true;
      return false;
    });

    console.log(`\n📊 [RÉSULTATS - Méthode alternative]`);
    console.log(
      `🎯 Produits avec catégorie ${PRESTATION_CATEGORY_ID}: ${prestationProducts.length}`
    );

    if (prestationProducts.length > 0) {
      prestationProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.price}€)`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur méthode alternative:', error);
  }
}

countPrestationProducts();

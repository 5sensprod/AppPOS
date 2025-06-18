#!/usr/bin/env node
// scripts/add-product-types.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration du chemin
const NEW_DB_PATH = path.join(__dirname, '../data/products.db');

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);
const isDryRun = args.includes('--test') || args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log('Usage:');
  console.log('  node scripts/add-product-types.js --test     # Mode test (simulation)');
  console.log('  node scripts/add-product-types.js --execute  # Exécution réelle');
  console.log('');
  console.log('Objectif:');
  console.log('  • Ajouter le champ "type": "service" ou "simple" selon catégorie');
  console.log('  • Configurer "manage_stock": false pour TOUS les produits');
  console.log('  • Le stock sera décrémenter côté serveur SAUF pour type "service"');
  console.log('');
  console.log("Note: manage_stock: false = pas d'affichage stock sur le site web");
  console.log('      Mais décrément en interne selon le type de produit');
  process.exit(1);
}

console.log(`🔧 [AJOUT TYPES] Mode: ${isDryRun ? 'TEST (simulation)' : 'EXÉCUTION RÉELLE'}`);
console.log('📋 [OBJECTIF] Ajouter type + manage_stock: false à tous les produits');
console.log(
  '⚠️  [STRATÉGIE] manage_stock: false pour TOUS (pas affichage web) + décrément côté serveur'
);
console.log('');

// ID de la catégorie PRESTATION
const PRESTATION_CATEGORY_ID = 'RMDigYsxjM7GooEg';

// Fonction pour charger les catégories
async function loadCategories() {
  try {
    const CATEGORIES_DB_PATH = path.join(__dirname, '../data/categories.db');

    if (!fs.existsSync(CATEGORIES_DB_PATH)) {
      console.warn(`⚠️  Fichier catégories non trouvé: ${CATEGORIES_DB_PATH}`);
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
    console.warn('⚠️  Erreur lors du chargement des catégories:', error);
    return null;
  }
}

// Fonction pour déterminer le type basé sur la catégorie PRESTATION
function determineProductType(product, prestationCategoryIds) {
  // Vérifier category_id direct
  if (product.category_id && prestationCategoryIds.includes(product.category_id)) {
    return 'service';
  }

  // Vérifier dans le tableau categories
  if (product.categories && Array.isArray(product.categories)) {
    const hasPrestation = product.categories.some((catId) => prestationCategoryIds.includes(catId));
    if (hasPrestation) {
      return 'service';
    }
  }

  // Par défaut, c'est un produit physique
  return 'simple';
}

// Fonction pour créer le rapport d'ajout des types
function createTypesReport(updates, timestamp) {
  const exportPath = path.join(__dirname, '../data/export');
  if (!fs.existsSync(exportPath)) {
    fs.mkdirSync(exportPath, { recursive: true });
  }

  const fileName = `ajout-types-produits_${timestamp}.txt`;
  const filePath = path.join(exportPath, fileName);

  let content = `# Ajout des types de produits
# Généré le: ${new Date().toLocaleString('fr-FR')}
# Total: ${updates.length} produits traités
# Format: SKU | NOM | TYPE_AJOUTÉ | MANAGE_STOCK | CATÉGORIE | RAISON
#================================================

`;

  updates.forEach((update) => {
    const product = update.product;
    const typeInfo =
      update.detectedType !== update.appliedType ? ` (Détecté: ${update.detectedType})` : '';
    content += `${product.sku || 'N/A'} | ${product.name || 'N/A'} | ${update.appliedType} | ${update.manageStock} | ${update.categoryName} | ${update.reason}${typeInfo}\n`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  return fileName;
}

async function addProductTypes() {
  try {
    if (!fs.existsSync(NEW_DB_PATH)) {
      console.error(`❌ [ERREUR] Base de données non trouvée: ${NEW_DB_PATH}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement de la base de données...');

    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    // Charger les catégories pour identifier PRESTATION
    console.log('📂 [INFO] Chargement des catégories...');
    const categories = await loadCategories();

    let prestationCategoryIds = [PRESTATION_CATEGORY_ID]; // ID principal

    if (categories) {
      console.log(`📊 [INFO] ${categories.length} catégories chargées`);

      // Trouver toutes les sous-catégories de PRESTATION
      const prestationSubCategories = categories.filter(
        (cat) => cat.parent_id === PRESTATION_CATEGORY_ID
      );

      console.log(
        `🎯 [INFO] ${prestationSubCategories.length} sous-catégories de PRESTATION trouvées`
      );
      prestationSubCategories.forEach((cat) => {
        console.log(`  - ${cat.name} (${cat._id})`);
      });

      // Ajouter les IDs des sous-catégories
      prestationCategoryIds.push(...prestationSubCategories.map((cat) => cat._id));
    } else {
      console.log("⚠️  [WARNING] Utilisation de l'ID PRESTATION principal uniquement");
    }

    console.log(`🔍 [INFO] IDs catégories PRESTATION: ${prestationCategoryIds.length} catégories`);

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] ${products.length} produits à analyser`);

    // Analyser l'état actuel
    let hasType = 0;
    let needsType = 0;
    let hasManageStock = 0;
    let needsManageStock = 0;
    const updates = [];

    products.forEach((product) => {
      const currentType = product.type;
      const currentManageStock = product.manage_stock;

      if (currentType) {
        hasType++;
      } else {
        needsType++;
      }

      if (currentManageStock !== undefined) {
        hasManageStock++;
      } else {
        needsManageStock++;
      }

      // Déterminer les valeurs à appliquer
      const detectedType = determineProductType(product, prestationCategoryIds);
      const appliedType = currentType || detectedType; // Utiliser le type détecté ou existant
      const shouldManageStock = false; // TOUJOURS false pour tous
      const finalManageStock = false; // FORCER false pour tous les produits

      let needsUpdate = false;
      let reason = '';

      if (!currentType) {
        needsUpdate = true;
        reason = 'Ajout type';
      }

      if (currentManageStock !== false) {
        needsUpdate = true;
        reason = reason ? reason + ' + manage_stock=false' : 'Forcer manage_stock=false';
      }

      // Obtenir le nom de la catégorie pour le rapport
      let categoryName = 'N/A';
      if (categories && product.category_id) {
        const category = categories.find((cat) => cat._id === product.category_id);
        categoryName = category ? category.name : 'Inconnue';
      }

      if (needsUpdate || detectedType === 'service' || currentManageStock !== false) {
        updates.push({
          product,
          appliedType,
          detectedType,
          manageStock: finalManageStock,
          needsUpdate,
          reason: reason || 'Déjà configuré',
          categoryName: categoryName,
        });
      }
    });

    console.log('\n📊 [ÉTAT ACTUEL]');
    console.log('================');
    console.log(`Produits avec type défini: ${hasType}`);
    console.log(`Produits sans type: ${needsType}`);
    console.log(
      `Produits avec manage_stock = false: ${products.filter((p) => p.manage_stock === false).length}`
    );
    console.log(
      `Produits avec manage_stock != false: ${products.filter((p) => p.manage_stock !== false).length}`
    );

    // Analyser les services détectés automatiquement
    const detectedServices = updates.filter((u) => u.detectedType === 'service');
    const detectedProducts = updates.filter((u) => u.detectedType === 'simple');

    console.log('\n🔍 [DÉTECTION PAR CATÉGORIE]');
    console.log('============================');
    console.log(`Services détectés (Prestation/*): ${detectedServices.length}`);
    console.log(`Produits physiques détectés: ${detectedProducts.length}`);

    if (detectedServices.length > 0) {
      console.log(
        `\n🚫 [SERVICES DÉTECTÉS] ${detectedServices.length} produits dans catégorie "Prestation":`
      );
      detectedServices.slice(0, 10).forEach((update, index) => {
        console.log(
          `  ${index + 1}. ${update.product.sku || 'N/A'} | ${update.product.name || 'N/A'}`
        );
        console.log(`     └─ Catégorie: ${update.categoryName}`);
      });
      if (detectedServices.length > 10) {
        console.log(`  ... et ${detectedServices.length - 10} autres`);
      }
      console.log('✅ Ces produits seront automatiquement configurés comme "service"');
    }

    const productsNeedingUpdate = updates.filter((u) => u.needsUpdate);

    if (productsNeedingUpdate.length === 0) {
      console.log('\n✅ [PARFAIT] Tous les produits ont déjà les champs type et manage_stock !');

      // Créer quand même le rapport pour montrer les suggestions
      if (updates.length > 0) {
        const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
        const reportFile = createTypesReport(updates, timestamp);
        console.log(`📄 [RAPPORT] Généré: ${reportFile} (suggestions de services)`);
      }
      return;
    }

    console.log(
      `\n🔄 [MISE À JOUR] ${productsNeedingUpdate.length} produits nécessitent une mise à jour`
    );

    // Afficher des exemples
    console.log('\n📝 [EXEMPLES] Produits à mettre à jour (5 premiers):');
    productsNeedingUpdate.slice(0, 5).forEach((update, index) => {
      const product = update.product;
      console.log(`  ${index + 1}. ${product.sku || 'N/A'} | ${product.name || 'N/A'}`);
      console.log(`     → type: "${update.appliedType}", manage_stock: ${update.manageStock}`);
    });

    // Exécuter les mises à jour
    if (!isDryRun) {
      console.log('\n🔄 [EXÉCUTION] Application des mises à jour...');

      let updated = 0;
      let errors = [];

      for (const update of productsNeedingUpdate) {
        try {
          const updateData = {};

          if (!update.product.type) {
            updateData.type = update.appliedType;
          }

          // TOUJOURS définir manage_stock à false
          updateData.manage_stock = false;

          if (Object.keys(updateData).length > 0) {
            await new Promise((resolve, reject) => {
              db.update(
                { _id: update.product._id },
                { $set: updateData },
                {},
                (err, numReplaced) => {
                  if (err) reject(err);
                  else resolve(numReplaced);
                }
              );
            });

            updated++;

            if (updated % 100 === 0) {
              console.log(
                `   Progression: ${updated}/${productsNeedingUpdate.length} produits traités`
              );
            }
          }
        } catch (error) {
          errors.push(`Erreur ${update.product._id}: ${error.message}`);
          console.error(`❌ Erreur: ${update.product._id}`);
        }
      }

      console.log(`\n✅ [SUCCÈS] ${updated} produits mis à jour`);
      if (errors.length > 0) {
        console.log(`⚠️  ${errors.length} erreurs rencontrées`);
      }
    } else {
      console.log('\n🔄 [SIMULATION] Mode test - aucune modification effectuée');
    }

    // Créer le rapport
    if (updates.length > 0) {
      const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      const reportFile = createTypesReport(updates, timestamp);
      console.log(`📄 [RAPPORT] Généré: ${reportFile}`);
    }

    // Recommandations
    console.log('\n💡 [PROCHAINES ÉTAPES]');
    console.log('=====================');
    console.log('1. 📄 Consultez le rapport généré pour voir la détection automatique');
    console.log('2. ✅ Services automatiquement détectés via catégorie "Prestation"');
    console.log('3. 🔄 Le saleController.js décrémenter tous les produits sauf type "service"');
    console.log("4. 🌐 manage_stock: false = pas d'affichage stock sur le site web");
    console.log('');
    console.log('🎯 Objectif atteint: Détection automatique services + stock caché web');

    if (isDryRun) {
      console.log(
        '\n💡 [INFO] Mode test terminé. Utilisez --execute pour appliquer les changements.'
      );
    } else {
      console.log('\n🎉 [TERMINÉ] Types de produits ajoutés avec succès !');
      console.log('✅ Tous les produits ont maintenant un type et manage_stock définis');
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter le script
console.log('🚀 [DÉMARRAGE] Ajout des types de produits...');
addProductTypes()
  .then(() => {
    console.log(`✅ [TERMINÉ] Ajout ${isDryRun ? 'simulé' : 'exécuté'} avec succès`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 [ÉCHEC] Erreur durant l'ajout:", error);
    process.exit(1);
  });

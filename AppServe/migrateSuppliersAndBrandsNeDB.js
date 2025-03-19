// migrateSuppliersAndBrandsNeDB.js
const fs = require('fs').promises;
const path = require('path');
const Datastore = require('nedb');
const util = require('util');

// Chemins des fichiers
const SOURCE_FILE = path.join(__dirname, 'data', 'source', 'old_suppliers.db');
const TARGET_BRANDS_FILE = path.join(__dirname, 'data', 'brands.db');
const TARGET_SUPPLIERS_FILE = path.join(__dirname, 'data', 'suppliers.db');

// Promisify nedb functions
function createDatastore(filePath) {
  const db = new Datastore({ filename: filePath, autoload: true });
  db.findAsync = util.promisify(db.find);
  db.insertAsync = util.promisify(db.insert);
  db.removeAsync = util.promisify(db.remove);
  db.findOneAsync = util.promisify(db.findOne);
  db.updateAsync = util.promisify(db.update);
  return db;
}

// Vérification et préparation des fichiers de destination
async function prepareDestinationFiles() {
  // Vérifier si les répertoires existent, sinon les créer
  const targetDir = path.dirname(TARGET_BRANDS_FILE);
  try {
    await fs.mkdir(targetDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  // Optionnel: Sauvegarder les fichiers existants avant de les modifier
  try {
    const now = new Date().toISOString().replace(/:/g, '-');

    for (const file of [TARGET_BRANDS_FILE, TARGET_SUPPLIERS_FILE]) {
      try {
        await fs.access(file);
        await fs.copyFile(file, `${file}.backup-${now}`);
        console.log(`Sauvegarde créée: ${file}.backup-${now}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  } catch (error) {
    console.warn('Avertissement lors de la création des sauvegardes:', error.message);
  }
}

// Fonction principale de migration
async function migrateSuppliersBrands(shouldReset = false) {
  console.log('Démarrage de la migration des fournisseurs et marques...');

  try {
    // Préparation des fichiers de destination
    await prepareDestinationFiles();

    // Si reset demandé, vider les bases de destination
    if (shouldReset) {
      const brandsDb = createDatastore(TARGET_BRANDS_FILE);
      const suppliersDb = createDatastore(TARGET_SUPPLIERS_FILE);

      await brandsDb.removeAsync({}, { multi: true });
      await suppliersDb.removeAsync({}, { multi: true });

      console.log('Bases de données cibles vidées avant migration.');
    }
    // 1. Lecture du fichier source
    const sourceData = await fs.readFile(SOURCE_FILE, 'utf8');
    const suppliers = sourceData
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    console.log(`Lecture de ${suppliers.length} fournisseurs depuis la source.`);

    // 2. Connexion aux bases cibles
    const brandsDb = createDatastore(TARGET_BRANDS_FILE);
    const suppliersDb = createDatastore(TARGET_SUPPLIERS_FILE);

    // 3. Migrer les données
    let importedBrands = 0;
    let importedSuppliers = 0;
    let errorCount = 0;

    // Map pour stocker les correspondances entre marques et fournisseurs
    const brandToSupplierMap = new Map();
    const brandNameToInfoMap = new Map(); // Stockage des informations des marques (ID et nom)
    const supplierIdMap = new Map(); // Pour stocker les IDs des fournisseurs

    // Vérifier les doublons d'ID avant la migration
    const processedIds = new Set();

    // Migrer d'abord tous les fournisseurs
    for (const oldSupplier of suppliers) {
      try {
        // Vérifier si l'ID a déjà été traité (éviter les doublons)
        if (processedIds.has(oldSupplier._id)) {
          console.log(
            `Fournisseur avec ID ${oldSupplier._id} déjà traité, génération d'un nouvel ID...`
          );
          continue; // Sauter ce fournisseur car déjà traité
        }

        processedIds.add(oldSupplier._id);

        // Générer supplier_code en sécurité
        let supplierCode;
        if (oldSupplier.supplierCode) {
          supplierCode = oldSupplier.supplierCode;
        } else if (oldSupplier.name && oldSupplier.name.length >= 3) {
          supplierCode = oldSupplier.name.substring(0, 3).toUpperCase();
        } else {
          supplierCode = `SUP${Math.floor(Math.random() * 1000)}`;
        }

        const newSupplier = {
          _id: oldSupplier._id,
          name: oldSupplier.name || 'Fournisseur sans nom',
          supplier_code: supplierCode,
          // Initialiser le tableau brands avec un format qui inclut les IDs
          // Ce tableau sera complété plus tard une fois que toutes les marques auront été créées
          brands: [], // Ceci sera mis à jour avec les références complètes (ID et nom)
          brandsRefs: [], // Nouveau tableau pour stocker les références {id, name}
          contact: {
            name: oldSupplier.contact || '',
            email: oldSupplier.email || '',
            phone: oldSupplier.phone || '',
            address: oldSupplier.address || '',
          },
          banking: {
            iban: oldSupplier.iban || '',
            bic: '',
          },
          payment_terms: {
            type: '',
            discount: 0,
          },
        };

        // Vérifier si la base contient déjà un enregistrement avec cet ID
        try {
          const existing = await suppliersDb.findOneAsync({ _id: oldSupplier._id });
          if (existing) {
            console.log(`Fournisseur ${oldSupplier._id} existe déjà dans la base cible, ignoré`);
            continue;
          }
        } catch (findError) {
          // Ignorer l'erreur de recherche et tenter l'insertion
        }

        await suppliersDb.insertAsync(newSupplier);
        supplierIdMap.set(oldSupplier._id, oldSupplier._id); // Stocker l'ID pour référence
        importedSuppliers++;

        // Stocker les marques associées à ce fournisseur
        if (oldSupplier.brands && Array.isArray(oldSupplier.brands)) {
          oldSupplier.brands.forEach((brandName) => {
            if (!brandToSupplierMap.has(brandName)) {
              brandToSupplierMap.set(brandName, []);
            }
            brandToSupplierMap.get(brandName).push(oldSupplier._id);
          });
        }
      } catch (error) {
        console.error(`Erreur lors de l'import du fournisseur ${oldSupplier._id}:`, error.message);
        errorCount++;
      }
    }

    // Migrer ensuite toutes les marques
    for (const [brandName, supplierIds] of brandToSupplierMap.entries()) {
      try {
        // Vérifier si la marque existe déjà dans la base cible
        let brandId;
        try {
          const existing = await brandsDb.findOneAsync({ name: brandName });
          if (existing) {
            console.log(
              `Marque ${brandName} existe déjà dans la base cible, mise à jour des fournisseurs`
            );

            // Récupérer les références existantes des fournisseurs
            const currentSuppliersRefs = Array.isArray(existing.suppliersRefs)
              ? existing.suppliersRefs
              : [];
            const currentSupplierIds = currentSuppliersRefs.map((ref) => ref.id);

            // Ajouter les nouveaux fournisseurs qui ne sont pas déjà référencés
            const newSuppliersRefs = [];
            for (const supplierId of supplierIds) {
              if (!currentSupplierIds.includes(supplierId)) {
                try {
                  const supplier = await suppliersDb.findOneAsync({ _id: supplierId });
                  if (supplier) {
                    newSuppliersRefs.push({
                      id: supplierId,
                      name: supplier.name || 'Fournisseur sans nom',
                    });
                  }
                } catch (error) {
                  console.warn(
                    `Impossible de trouver le fournisseur ${supplierId} pour la référence`
                  );
                }
              }
            }

            await brandsDb.updateAsync(
              { _id: existing._id },
              {
                $set: {
                  suppliers: [...new Set([...(existing.suppliers || []), ...supplierIds])],
                  suppliersRefs: [...currentSuppliersRefs, ...newSuppliersRefs],
                },
              },
              {}
            );
            importedBrands++;
            brandId = existing._id;
          } else {
            // Créer les références des fournisseurs pour cette marque
            const suppliersRefs = [];
            for (const supplierId of supplierIds) {
              try {
                const supplier = await suppliersDb.findOneAsync({ _id: supplierId });
                if (supplier) {
                  suppliersRefs.push({
                    id: supplierId,
                    name: supplier.name || 'Fournisseur sans nom',
                  });
                }
              } catch (error) {
                console.warn(
                  `Impossible de trouver le fournisseur ${supplierId} pour la référence`
                );
              }
            }

            const newBrand = {
              name: brandName,
              slug: generateSlug(brandName),
              description: '',
              suppliers: supplierIds,
              suppliersRefs: suppliersRefs,
              woo_id: null,
              last_sync: null,
            };

            const insertedBrand = await brandsDb.insertAsync(newBrand);
            importedBrands++;
            brandId = insertedBrand._id;
          }

          // Stocker l'ID et le nom de la marque pour référence ultérieure
          brandNameToInfoMap.set(brandName, { id: brandId, name: brandName });
        } catch (error) {
          console.error(`Erreur lors de la gestion de la marque ${brandName}:`, error.message);
          continue;
        }
      } catch (error) {
        console.error(`Erreur lors de l'import de la marque ${brandName}:`, error.message);
        errorCount++;
      }
    }

    // Phase finale: Mettre à jour les fournisseurs avec leurs marques associées (références complètes)
    console.log('Mise à jour des fournisseurs avec les références complètes des marques...');

    // Pour chaque marque, mettre à jour les fournisseurs associés
    for (const [brandName, supplierIds] of brandToSupplierMap.entries()) {
      // Récupérer les informations complètes de la marque
      const brandInfo = brandNameToInfoMap.get(brandName);
      if (!brandInfo) {
        console.warn(`Information de marque non trouvée pour ${brandName}, ignoré`);
        continue;
      }

      for (const supplierId of supplierIds) {
        try {
          // Vérifier que le fournisseur existe
          const supplier = await suppliersDb.findOneAsync({ _id: supplierId });
          if (!supplier) {
            console.warn(`Fournisseur ${supplierId} non trouvé lors de la mise à jour des marques`);
            continue;
          }

          // Assurer que les tableaux existent
          const currentBrands = Array.isArray(supplier.brands) ? supplier.brands : [];
          const currentBrandsRefs = Array.isArray(supplier.brandsRefs) ? supplier.brandsRefs : [];

          // Vérifier si cette marque est déjà référencée dans le fournisseur
          const hasNameInArray = currentBrands.includes(brandName);
          const hasIdInRefs = currentBrandsRefs.some((ref) => ref.id === brandInfo.id);

          // Mise à jour des tableaux de marques
          if (!hasNameInArray) {
            currentBrands.push(brandName);
          }

          if (!hasIdInRefs) {
            currentBrandsRefs.push({ id: brandInfo.id, name: brandName });
          }

          // Mettre à jour le fournisseur avec les deux formats
          await suppliersDb.updateAsync(
            { _id: supplierId },
            {
              $set: {
                brands: currentBrands,
                brandsRefs: currentBrandsRefs,
              },
            },
            {}
          );
          console.log(
            `Marque "${brandName}" (ID: ${brandInfo.id}) ajoutée au fournisseur ${supplierId}`
          );
        } catch (error) {
          console.error(
            `Erreur lors de la mise à jour du fournisseur ${supplierId} avec la marque ${brandName}:`,
            error.message
          );
          errorCount++;
        }
      }
    }

    console.log(
      `Migration terminée: ${importedSuppliers} fournisseurs et ${importedBrands} marques importés, ${errorCount} erreurs.`
    );

    return {
      success: true,
      importedSuppliers,
      importedBrands,
      errors: errorCount,
    };
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return { success: false, error: error.message };
  }
}

// Fonction utilitaire pour générer un slug
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Exécuter la migration
if (require.main === module) {
  // Analyser les arguments de ligne de commande
  const args = process.argv.slice(2);
  const shouldReset = args.includes('--reset') || args.includes('-r');

  if (shouldReset) {
    console.log('Mode reset activé: les bases de données cibles seront vidées avant migration');
  }

  migrateSuppliersBrands(shouldReset)
    .then((result) => {
      if (result.success) {
        console.log('Migration réussie!');
      } else {
        console.error('Échec de la migration:', result.error);
      }
    })
    .catch((error) => {
      console.error('Erreur non gérée:', error);
    });
}

module.exports = { migrateSuppliersBrands };

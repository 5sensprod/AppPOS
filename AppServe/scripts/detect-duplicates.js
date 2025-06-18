#!/usr/bin/env node
// scripts/detect-duplicates.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration du chemin
const NEW_DB_PATH = path.join(__dirname, '../data/products.db');

console.log('🔍 [DÉTECTION DOUBLONS] Analyse des doublons dans la base actuelle');

// Fonction pour extraire le gencode/barcode
function extractGencode(product) {
  let gencode = product.gencode || product.barcode || product.ean || product.upc || '';

  if (!gencode && product.meta_data && Array.isArray(product.meta_data)) {
    const barcodeMetaData = product.meta_data.find(
      (meta) =>
        meta.key === 'barcode' || meta.key === 'gencode' || meta.key === 'ean' || meta.key === 'upc'
    );
    if (barcodeMetaData && barcodeMetaData.value) {
      gencode = barcodeMetaData.value;
    }
  }

  return gencode ? String(gencode).trim() : '';
}

// Fonction pour normaliser un nom de produit
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour créer l'en-tête de fichier
function createFileHeader(title, count) {
  const date = new Date().toLocaleString('fr-FR');
  return `# ${title}
# Généré le: ${date}
# Total: ${count} groupes de doublons
# Format: TYPE | SKU1 | NOM1 | SKU2 | NOM2 | CRITÈRE
#================================================

`;
}

// Fonction pour créer le nom de fichier
function createFileName(baseName) {
  const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  return `${baseName}_${timestamp}.txt`;
}

async function detectDuplicates() {
  try {
    if (!fs.existsSync(NEW_DB_PATH)) {
      console.error(`❌ [ERREUR] Base de données non trouvée: ${NEW_DB_PATH}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement de la base de données...');

    const db = new Datastore({ filename: NEW_DB_PATH, autoload: true });

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] ${products.length} produits à analyser`);

    // Maps pour détecter les doublons
    const gencodeMap = new Map();
    const skuMap = new Map();
    const nameMap = new Map();
    const combinedMap = new Map(); // SKU + nom normalisé

    // Analyser chaque produit
    products.forEach((product) => {
      const gencode = extractGencode(product);
      const sku = product.sku || '';
      const name = product.name || product.designation || '';
      const normalizedName = normalizeName(name);
      const combined = `${sku.toLowerCase()}_${normalizedName}`.trim();

      // Collecter par gencode (si non vide)
      if (gencode && gencode !== '') {
        if (!gencodeMap.has(gencode)) {
          gencodeMap.set(gencode, []);
        }
        gencodeMap.get(gencode).push(product);
      }

      // Collecter par SKU (si non vide)
      if (sku && sku !== '' && sku !== 'N/A') {
        if (!skuMap.has(sku)) {
          skuMap.set(sku, []);
        }
        skuMap.get(sku).push(product);
      }

      // Collecter par nom normalisé (si non vide et assez long)
      if (normalizedName && normalizedName.length > 3) {
        if (!nameMap.has(normalizedName)) {
          nameMap.set(normalizedName, []);
        }
        nameMap.get(normalizedName).push(product);
      }

      // Collecter par combinaison SKU + nom
      if (combined && combined.length > 5 && !combined.startsWith('_') && !combined.endsWith('_')) {
        if (!combinedMap.has(combined)) {
          combinedMap.set(combined, []);
        }
        combinedMap.get(combined).push(product);
      }
    });

    // Identifier les doublons
    const duplicatesByGencode = Array.from(gencodeMap.entries()).filter(
      ([_, prods]) => prods.length > 1
    );
    const duplicatesBySku = Array.from(skuMap.entries()).filter(([_, prods]) => prods.length > 1);
    const duplicatesByName = Array.from(nameMap.entries()).filter(([_, prods]) => prods.length > 1);
    const duplicatesByCombined = Array.from(combinedMap.entries()).filter(
      ([_, prods]) => prods.length > 1
    );

    console.log('\n📊 [RÉSULTATS DÉTECTION]');
    console.log('========================');
    console.log(`Doublons par gencode/barcode: ${duplicatesByGencode.length} groupes`);
    console.log(`Doublons par SKU: ${duplicatesBySku.length} groupes`);
    console.log(`Doublons par nom: ${duplicatesByName.length} groupes`);
    console.log(`Doublons par combinaison: ${duplicatesByCombined.length} groupes`);

    // Compter le nombre total de produits en doublon
    let totalProductsInDuplicates = 0;
    let allDuplicates = [];

    // Traiter les doublons par gencode (PRIORITÉ HAUTE)
    duplicatesByGencode.forEach(([gencode, prods]) => {
      const count = prods.length;
      totalProductsInDuplicates += count;
      console.log(`\n🔴 [CRITIQUE] Gencode "${gencode}": ${count} produits`);
      prods.forEach((prod, index) => {
        console.log(
          `  ${index + 1}. ${prod._id} | SKU: ${prod.sku || 'N/A'} | ${prod.name || 'N/A'}`
        );
      });

      // Ajouter aux doublons pour export
      for (let i = 0; i < prods.length - 1; i++) {
        for (let j = i + 1; j < prods.length; j++) {
          allDuplicates.push({
            type: 'GENCODE',
            product1: prods[i],
            product2: prods[j],
            criterion: gencode,
            severity: 'CRITIQUE',
          });
        }
      }
    });

    // Traiter les doublons par SKU (PRIORITÉ HAUTE)
    duplicatesBySku.forEach(([sku, prods]) => {
      const count = prods.length;
      // Éviter de recompter les produits déjà comptés par gencode
      const newProds = prods.filter((p) => {
        const gencode = extractGencode(p);
        return !gencode || !gencodeMap.has(gencode) || gencodeMap.get(gencode).length === 1;
      });

      if (newProds.length > 1) {
        totalProductsInDuplicates += newProds.length;
        console.log(`\n🟠 [IMPORTANT] SKU "${sku}": ${count} produits`);
        prods.forEach((prod, index) => {
          const gencode = extractGencode(prod);
          console.log(
            `  ${index + 1}. ${prod._id} | Gencode: ${gencode || 'N/A'} | ${prod.name || 'N/A'}`
          );
        });

        // Ajouter aux doublons pour export
        for (let i = 0; i < prods.length - 1; i++) {
          for (let j = i + 1; j < prods.length; j++) {
            allDuplicates.push({
              type: 'SKU',
              product1: prods[i],
              product2: prods[j],
              criterion: sku,
              severity: 'IMPORTANT',
            });
          }
        }
      }
    });

    // Traiter les doublons par nom (PRIORITÉ MOYENNE)
    const significantNameDuplicates = duplicatesByName.filter(
      ([name, prods]) => prods.length > 2 || name.length > 10
    );
    significantNameDuplicates.slice(0, 10).forEach(([name, prods]) => {
      console.log(`\n🟡 [MODÉRÉ] Nom "${name}": ${prods.length} produits`);
      prods.slice(0, 3).forEach((prod, index) => {
        console.log(
          `  ${index + 1}. ${prod._id} | SKU: ${prod.sku || 'N/A'} | Gencode: ${extractGencode(prod) || 'N/A'}`
        );
      });
      if (prods.length > 3) {
        console.log(`  ... et ${prods.length - 3} autres`);
      }
    });

    // Statistiques finales
    console.log('\n📈 [STATISTIQUES FINALES]');
    console.log('=========================');
    console.log(`Total produits analysés: ${products.length}`);
    console.log(`Groupes de doublons critiques (gencode): ${duplicatesByGencode.length}`);
    console.log(`Groupes de doublons importants (SKU): ${duplicatesBySku.length}`);
    console.log(`Groupes de doublons potentiels (nom): ${duplicatesByName.length}`);

    const duplicatePercentage = ((totalProductsInDuplicates / products.length) * 100).toFixed(2);
    console.log(`Pourcentage de produits en doublon: ${duplicatePercentage}%`);

    // Export des doublons critiques et importants
    if (allDuplicates.length > 0) {
      const exportPath = path.join(__dirname, '../data/export');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      const fileName = createFileName('doublons-detectes');
      const filePath = path.join(exportPath, fileName);

      let fileContent = createFileHeader(
        'Doublons détectés dans la base actuelle',
        allDuplicates.length
      );

      allDuplicates.forEach((duplicate) => {
        const p1 = duplicate.product1;
        const p2 = duplicate.product2;
        fileContent += `${duplicate.type} | ${p1.sku || 'N/A'} | ${p1.name || 'N/A'} | ${p2.sku || 'N/A'} | ${p2.name || 'N/A'} | ${duplicate.criterion}\n`;
      });

      fs.writeFileSync(filePath, fileContent, 'utf8');

      console.log(`\n✅ [EXPORT] Rapport généré: ${fileName}`);
      console.log(`📄 [EXPORT] ${allDuplicates.length} paires de doublons exportées`);
    } else {
      console.log('\n✅ [EXCELLENT] Aucun doublon critique détecté !');
    }

    // Recommandations
    console.log('\n💡 [RECOMMANDATIONS]');
    console.log('====================');
    if (duplicatesByGencode.length > 0) {
      console.log('🔴 URGENT: Résoudre les doublons par gencode/barcode (même code-barres)');
    }
    if (duplicatesBySku.length > 0) {
      console.log('🟠 IMPORTANT: Vérifier les doublons par SKU (même référence)');
    }
    if (duplicatesByName.length > 20) {
      console.log('🟡 MODÉRÉ: Beaucoup de produits avec des noms similaires à vérifier');
    }
    if (duplicatesByGencode.length === 0 && duplicatesBySku.length === 0) {
      console.log('✅ PARFAIT: Aucun doublon critique détecté sur les critères principaux');
    }
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE]', error);
    process.exit(1);
  }
}

// Exécuter la détection
console.log('🚀 [DÉMARRAGE] Détection des doublons...');
detectDuplicates()
  .then(() => {
    console.log('\n✅ [TERMINÉ] Détection terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [ÉCHEC] Erreur durant la détection:', error);
    process.exit(1);
  });

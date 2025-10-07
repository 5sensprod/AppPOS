#!/usr/bin/env node
// scripts/update-database.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuration
const MY_DB = path.join(__dirname, '../data/products.db');
const CLIENT_DB = path.join(__dirname, '../data/source/products-axe.db');
const BACKUP_DIR = path.join(__dirname, '../data/backups');

// Extraire le gencode
function getGencode(product) {
  let gencode = product.gencode || product.barcode || product.ean || product.upc || '';

  if (!gencode && product.meta_data && Array.isArray(product.meta_data)) {
    const meta = product.meta_data.find(
      (m) => m.key === 'barcode' || m.key === 'gencode' || m.key === 'ean' || m.key === 'upc'
    );
    if (meta && meta.value) gencode = meta.value;
  }

  return gencode ? String(gencode).trim() : '';
}

// Créer une sauvegarde
function createBackup(dbPath) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `products_backup_${timestamp}.db`);

  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Sauvegarde créée: ${backupPath}`);
  return backupPath;
}

// Demander confirmation
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'o');
    });
  });
}

// Mettre à jour le gencode dans meta_data
function updateGencodeInMetaData(product, newGencode) {
  if (!product.meta_data) {
    product.meta_data = [];
  }

  const barcodeIndex = product.meta_data.findIndex(
    (m) => m.key === 'barcode' || m.key === 'gencode' || m.key === 'ean' || m.key === 'upc'
  );

  if (barcodeIndex >= 0) {
    product.meta_data[barcodeIndex].value = newGencode;
  } else {
    product.meta_data.push({
      key: 'barcode',
      value: newGencode,
    });
  }

  // Mettre à jour aussi les champs directs
  if (product.barcode !== undefined) product.barcode = newGencode;
  if (product.gencode !== undefined) product.gencode = newGencode;
  if (product.ean !== undefined) product.ean = newGencode;
}

async function updateDatabase() {
  console.log('🔄 MISE À JOUR DE LA BASE DE DONNÉES\n');

  // Charger les bases
  const myDb = new Datastore({ filename: MY_DB, autoload: true });
  const clientDb = new Datastore({ filename: CLIENT_DB, autoload: true });

  const myProducts = await new Promise((resolve, reject) => {
    myDb.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  const clientProducts = await new Promise((resolve, reject) => {
    clientDb.find({}, (err, docs) => (err ? reject(err) : resolve(docs)));
  });

  console.log(`Ma base: ${myProducts.length} produits`);
  console.log(`Base client: ${clientProducts.length} produits\n`);

  // Indexer mes produits
  const myMap = new Map();
  myProducts.forEach((p) => {
    myMap.set(p._id, p);
    const gencode = getGencode(p);
    if (gencode) myMap.set(`g_${gencode}`, p);
    if (p.sku) myMap.set(`s_${p.sku}`, p);
  });

  // Analyser les modifications
  const modifiedProducts = [];

  clientProducts.forEach((clientP) => {
    let myP = myMap.get(clientP._id);
    if (!myP) {
      const gencode = getGencode(clientP);
      if (gencode) myP = myMap.get(`g_${gencode}`);
    }
    if (!myP && clientP.sku) {
      myP = myMap.get(`s_${clientP.sku}`);
    }

    if (myP) {
      const changes = [];

      const myPrice = parseFloat(myP.price) || 0;
      const clientPrice = parseFloat(clientP.price) || 0;
      if (myPrice !== clientPrice) {
        changes.push({ field: 'price', old: myPrice, new: clientPrice });
      }

      const myPurchase = parseFloat(myP.purchase_price) || 0;
      const clientPurchase = parseFloat(clientP.purchase_price) || 0;
      if (myPurchase !== clientPurchase) {
        changes.push({ field: 'purchase_price', old: myPurchase, new: clientPurchase });
      }

      const myStock = parseInt(myP.stock) || 0;
      const clientStock = parseInt(clientP.stock) || 0;
      if (myStock !== clientStock) {
        changes.push({ field: 'stock', old: myStock, new: clientStock });
      }

      const myGencode = getGencode(myP);
      const clientGencode = getGencode(clientP);
      if (myGencode !== clientGencode) {
        changes.push({ field: 'gencode', old: myGencode, new: clientGencode });
      }

      if (changes.length > 0) {
        modifiedProducts.push({
          id: myP._id,
          sku: myP.sku || 'N/A',
          name: myP.name || 'N/A',
          product: myP,
          clientProduct: clientP,
          changes: changes,
        });
      }
    }
  });

  console.log(`📊 ${modifiedProducts.length} produits à mettre à jour\n`);

  if (modifiedProducts.length === 0) {
    console.log('✅ Aucune mise à jour nécessaire');
    return;
  }

  // Afficher un échantillon
  console.log('APERÇU DES MODIFICATIONS:\n');
  modifiedProducts.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (${p.sku})`);
    p.changes.forEach((c) => {
      console.log(`   - ${c.field}: ${c.old} → ${c.new}`);
    });
    console.log('');
  });

  if (modifiedProducts.length > 5) {
    console.log(`... et ${modifiedProducts.length - 5} autres produits\n`);
  }

  // Demander confirmation
  const confirmed = await askConfirmation(
    `⚠️  Voulez-vous appliquer ces ${modifiedProducts.length} modifications ? (oui/non): `
  );

  if (!confirmed) {
    console.log('❌ Mise à jour annulée');
    return;
  }

  // Créer une sauvegarde
  console.log("\n📦 Création d'une sauvegarde...");
  createBackup(MY_DB);

  // Appliquer les modifications
  console.log('\n🔄 Application des modifications...\n');
  let updateCount = 0;

  for (const item of modifiedProducts) {
    const updates = {};

    item.changes.forEach((change) => {
      if (change.field === 'gencode') {
        // Mise à jour spéciale pour gencode
        updateGencodeInMetaData(item.product, change.new);
        updates.meta_data = item.product.meta_data;
        if (item.product.barcode !== undefined) updates.barcode = change.new;
        if (item.product.gencode !== undefined) updates.gencode = change.new;
      } else {
        updates[change.field] = change.new;
      }
    });

    // Si le produit a la clé pending_sync, la passer à true
    if (item.product.hasOwnProperty('pending_sync')) {
      updates.pending_sync = true;
    }

    // Mettre à jour dans la base
    await new Promise((resolve, reject) => {
      myDb.update({ _id: item.id }, { $set: updates }, {}, (err, numReplaced) => {
        if (err) reject(err);
        else {
          updateCount++;
          const syncFlag = updates.pending_sync ? ' 🔄' : '';
          console.log(`✅ ${updateCount}/${modifiedProducts.length} - ${item.name}${syncFlag}`);
          resolve(numReplaced);
        }
      });
    });
  }

  // Compacter la base
  await new Promise((resolve) => {
    myDb.persistence.compactDatafile();
    myDb.on('compaction.done', resolve);
  });

  console.log(`\n✅ ${updateCount} produits mis à jour avec succès !`);
  console.log(`📦 Sauvegarde disponible dans: ${BACKUP_DIR}`);

  // Générer un rapport
  const exportPath = path.join(__dirname, '../data/export');
  fs.mkdirSync(exportPath, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const reportPath = path.join(exportPath, `rapport-maj_${timestamp}.txt`);

  let report = `RAPPORT DE MISE À JOUR
Généré le: ${new Date().toLocaleString('fr-FR')}
Produits mis à jour: ${updateCount}
========================================

`;

  modifiedProducts.forEach((p, i) => {
    report += `\n${i + 1}. ${p.name}\n`;
    report += `ID: ${p.id} | SKU: ${p.sku}\n`;
    report += `Modifications appliquées:\n`;
    p.changes.forEach((c) => {
      report += `  - ${c.field}: ${c.old} → ${c.new}\n`;
    });
    report += '\n';
  });

  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 Rapport généré: ${reportPath}`);
}

// Lancer
updateDatabase().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

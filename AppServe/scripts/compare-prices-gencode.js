#!/usr/bin/env node
// scripts/compare-prices-gencode.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Configuration
const MY_DB = path.join(__dirname, '../data/products.db');
const CLIENT_DB = path.join(__dirname, '../data/source/products-axe.db');

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

async function compare() {
  console.log('🔍 Comparaison PRIX et GENCODE\n');

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

  // Comparer par produit
  const modifiedProducts = [];

  clientProducts.forEach((clientP) => {
    // Trouver correspondance
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

      // Vérifier le prix de vente
      const myPrice = parseFloat(myP.price) || 0;
      const clientPrice = parseFloat(clientP.price) || 0;

      if (myPrice !== clientPrice) {
        changes.push({
          field: 'Prix vente',
          icon: '💰',
          oldValue: `${myPrice}€`,
          newValue: `${clientPrice}€`,
          diff: `${clientPrice - myPrice > 0 ? '+' : ''}${(clientPrice - myPrice).toFixed(2)}€`,
        });
      }

      // Vérifier le prix d'achat
      const myPurchase = parseFloat(myP.purchase_price) || 0;
      const clientPurchase = parseFloat(clientP.purchase_price) || 0;

      if (myPurchase !== clientPurchase) {
        changes.push({
          field: 'Prix achat',
          icon: '🛒',
          oldValue: `${myPurchase}€`,
          newValue: `${clientPurchase}€`,
          diff: `${clientPurchase - myPurchase > 0 ? '+' : ''}${(clientPurchase - myPurchase).toFixed(2)}€`,
        });
      }

      // Vérifier le stock
      const myStock = parseInt(myP.stock) || 0;
      const clientStock = parseInt(clientP.stock) || 0;

      if (myStock !== clientStock) {
        changes.push({
          field: 'Stock',
          icon: '📦',
          oldValue: myStock,
          newValue: clientStock,
          diff: `${clientStock - myStock > 0 ? '+' : ''}${clientStock - myStock}`,
        });
      }

      // Vérifier le gencode
      const myGencode = getGencode(myP);
      const clientGencode = getGencode(clientP);

      if (myGencode !== clientGencode) {
        changes.push({
          field: 'Gencode',
          icon: '🏷️',
          oldValue: myGencode || 'VIDE',
          newValue: clientGencode || 'VIDE',
          diff: '',
        });
      }

      // Si des changements, ajouter le produit
      if (changes.length > 0) {
        modifiedProducts.push({
          id: clientP._id,
          sku: clientP.sku || 'N/A',
          name: clientP.name || 'N/A',
          changes: changes,
        });
      }
    }
  });

  // Afficher résultats
  console.log('📊 RÉSULTATS\n');
  console.log(`Total de produits modifiés: ${modifiedProducts.length}\n`);

  if (modifiedProducts.length > 0) {
    console.log('PRODUITS MODIFIÉS:\n');
    console.log('='.repeat(60));

    modifiedProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id} | SKU: ${product.sku}`);
      console.log(`   Modifications:`);

      product.changes.forEach((change) => {
        console.log(
          `   ${change.icon} ${change.field}: ${change.oldValue} → ${change.newValue} ${change.diff}`
        );
      });

      console.log('-'.repeat(60));
    });
  } else {
    console.log('✅ Aucune modification détectée');
  }

  // Export
  const exportPath = path.join(__dirname, '../data/export');
  fs.mkdirSync(exportPath, { recursive: true });

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const filePath = path.join(exportPath, `comparaison-produits_${timestamp}.txt`);

  let content = `COMPARAISON PRODUITS
Généré le: ${new Date().toLocaleString('fr-FR')}
Total de produits modifiés: ${modifiedProducts.length}
========================================

`;

  if (modifiedProducts.length > 0) {
    modifiedProducts.forEach((product, index) => {
      content += `\n${index + 1}. ${product.name}\n`;
      content += `ID: ${product.id}\n`;
      content += `SKU: ${product.sku}\n`;
      content += `Modifications:\n`;

      product.changes.forEach((change) => {
        content += `  - ${change.field}: ${change.oldValue} → ${change.newValue} ${change.diff}\n`;
      });

      content += '\n' + '-'.repeat(60) + '\n';
    });
  } else {
    content += '\n✅ Aucune modification détectée\n';
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`\n✅ Rapport exporté: ${filePath}`);
}

// Lancer
compare().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});

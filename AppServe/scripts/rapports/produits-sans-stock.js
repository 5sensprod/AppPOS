// scripts/rapports/produits-sans-stock.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Fonction utilitaire pour créer l'en-tête standard
function createFileHeader(title, count) {
  const date = new Date().toLocaleString('fr-FR');
  return `# ${title}
# Généré le: ${date}
# Total: ${count} produits
# Format: SKU | NOM | STOCK
#================================================

`;
}

// Fonction utilitaire pour créer le nom de fichier avec source
function createFileName(baseName, source) {
  const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const sourcePrefix = source === 'old' ? 'ancien-' : '';
  return `${sourcePrefix}${baseName}_${timestamp}.txt`;
}

async function generateReport(dbPath, source = 'new') {
  try {
    console.log(`🔍 [DEBUG] Source reçue: "${source}"`);

    if (!fs.existsSync(dbPath)) {
      console.error(`❌ [ERREUR] Base de données non trouvée: ${dbPath}`);
      process.exit(1);
    }

    console.log('📂 [INFO] Chargement de la base de données...');

    const db = new Datastore({ filename: dbPath, autoload: true });

    const products = await new Promise((resolve, reject) => {
      db.find({}, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });

    console.log(`📊 [INFO] ${products.length} produits à analyser`);

    let produitssSansStock = [];
    let stockZero = 0;
    let stockNull = 0;
    let stockUndefined = 0;
    let stockManquant = 0;

    products.forEach((product) => {
      const stock = product.stock;
      let isOutOfStock = false;
      let stockStatus = '';

      if (stock === undefined) {
        stockUndefined++;
        isOutOfStock = true;
        stockStatus = 'undefined';
      } else if (stock === null) {
        stockNull++;
        isOutOfStock = true;
        stockStatus = 'null';
      } else if (stock === 0 || stock === '0') {
        stockZero++;
        isOutOfStock = true;
        stockStatus = '0';
      } else if (!product.hasOwnProperty('stock')) {
        stockManquant++;
        isOutOfStock = true;
        stockStatus = 'manquant';
      }

      if (isOutOfStock) {
        // Adapter les champs selon la source
        let sku, name, brand;

        if (source === 'old') {
          sku = product.reference || 'N/A';
          name = product.designation || 'N/A';
          brand = product.brand || product.marque || 'N/A';
        } else {
          sku = product.sku || product.reference || 'N/A';
          name = product.name || product.designation || 'N/A';
          brand = product.brand_ref?.name || product.brand || 'N/A';
        }

        produitssSansStock.push({
          sku: sku,
          name: name,
          stock: stockStatus,
          brand: brand,
          price: product.price || product.prixVente || 'N/A',
        });
      }
    });

    console.log('\n📊 [STATISTIQUES]');
    console.log('=================');
    console.log(`Stock à 0: ${stockZero}`);
    console.log(`Stock null: ${stockNull}`);
    console.log(`Stock undefined: ${stockUndefined}`);
    console.log(`Clé stock manquante: ${stockManquant}`);
    console.log(`Total sans stock: ${produitssSansStock.length}`);
    console.log(
      `Pourcentage: ${((produitssSansStock.length / products.length) * 100).toFixed(2)}%`
    );

    if (produitssSansStock.length > 0) {
      // Créer le dossier export s'il n'existe pas
      const exportPath = path.join(__dirname, '../../data/export');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      // Créer le fichier avec indication de la source
      console.log(`🔍 [DEBUG] Création fichier avec source: "${source}"`);
      const fileName = createFileName('produits-sans-stock', source);
      console.log(`🔍 [DEBUG] Nom de fichier généré: "${fileName}"`);
      const filePath = path.join(exportPath, fileName);

      const sourceText = source === 'old' ? 'ancienne base de données' : 'base de données actuelle';
      let fileContent = createFileHeader(
        `Produits sans stock (0, null, undefined) - ${sourceText}`,
        produitssSansStock.length
      );

      produitssSansStock.forEach((item) => {
        fileContent += `${item.sku} | ${item.name} | ${item.stock}\n`;
      });

      fs.writeFileSync(filePath, fileContent, 'utf8');

      console.log(`\n✅ [EXPORT] Rapport généré: ${fileName}`);
      console.log(`📄 [EXPORT] ${produitssSansStock.length} produits exportés`);

      // Afficher quelques exemples
      console.log('\n📝 [EXEMPLES] Premiers produits sans stock:');
      produitssSansStock.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.sku} | ${item.name} | Stock: ${item.stock}`);
      });

      if (produitssSansStock.length > 5) {
        console.log(`  ... et ${produitssSansStock.length - 5} autres dans le fichier`);
      }
    } else {
      console.log('\n✅ [INFO] Tous les produits ont du stock défini et > 0');
    }
  } catch (error) {
    console.error('❌ [ERREUR] Erreur lors de la génération du rapport:', error);
    throw error;
  }
}

module.exports = { generateReport };

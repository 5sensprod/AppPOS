// scripts/rapports/codes-barres-zero.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Fonction utilitaire pour créer l'en-tête standard
function createFileHeader(title, count) {
  const date = new Date().toLocaleString('fr-FR');
  return `# ${title}
# Généré le: ${date}
# Total: ${count} produits
# Format: SKU | BARCODE
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

    let gencodeStartingWithZeroList = [];

    products.forEach((product) => {
      let gencode = '';

      if (source === 'old') {
        // Structure ancienne base : gencode direct
        gencode = product.gencode || '';
      } else {
        // Structure nouvelle base : gencode direct + meta_data
        gencode = product.gencode || product.barcode || product.ean || product.upc || '';

        if (!gencode && product.meta_data && Array.isArray(product.meta_data)) {
          const barcodeMetaData = product.meta_data.find(
            (meta) =>
              meta.key === 'barcode' ||
              meta.key === 'gencode' ||
              meta.key === 'ean' ||
              meta.key === 'upc'
          );
          if (barcodeMetaData && barcodeMetaData.value) {
            gencode = barcodeMetaData.value;
          }
        }
      }

      if (gencode) {
        const gencodeStr = String(gencode).trim();
        if (gencodeStr.startsWith('0')) {
          gencodeStartingWithZeroList.push({
            sku: product.sku || product.reference || 'N/A',
            gencode: gencodeStr,
          });
        }
      }
    });

    console.log(
      `🔍 [RÉSULTAT] ${gencodeStartingWithZeroList.length} produits avec codes-barres commençant par 0`
    );

    if (gencodeStartingWithZeroList.length > 0) {
      // Créer le dossier export s'il n'existe pas
      const exportPath = path.join(__dirname, '../../data/export');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      // Créer le fichier avec indication de la source
      const fileName = createFileName('codes-barres-commencent-par-zero', source);
      const filePath = path.join(exportPath, fileName);

      const sourceText = source === 'old' ? 'ancienne base de données' : 'base de données actuelle';
      let fileContent = createFileHeader(
        `Produits avec codes-barres commençant par 0 (${sourceText})`,
        gencodeStartingWithZeroList.length
      );

      gencodeStartingWithZeroList.forEach((item) => {
        fileContent += `${item.sku} | ${item.gencode}\n`;
      });

      fs.writeFileSync(filePath, fileContent, 'utf8');

      console.log(`✅ [EXPORT] Rapport généré: ${fileName}`);
      console.log(`📄 [EXPORT] ${gencodeStartingWithZeroList.length} produits exportés`);
    } else {
      console.log('✅ [INFO] Aucun produit avec code-barres commençant par 0');
    }
  } catch (error) {
    console.error('❌ [ERREUR] Erreur lors de la génération du rapport:', error);
    throw error;
  }
}

module.exports = { generateReport };

// scripts/rapports/produits-sans-categorie.js
const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Fonction utilitaire pour créer l'en-tête standard
function createFileHeader(title, count) {
  const date = new Date().toLocaleString('fr-FR');
  return `# ${title}
# Généré le: ${date}
# Total: ${count} produits
# Format: SKU | DESIGNATION
#================================================

`;
}

// Fonction utilitaire pour créer le nom de fichier avec source
function createFileName(baseName, source) {
  const timestamp = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const sourcePrefix = source === 'old' ? 'ancien-' : '';
  return `${sourcePrefix}${baseName}_${timestamp}.txt`;
}

// Fonction pour vérifier si un produit n'a pas de catégorie
function hasNoCategory(product, source) {
  if (source === 'old') {
    // Logique pour ancienne base de données
    return !product.category_id && (!product.categories || product.categories.length === 0);
  } else {
    // Logique pour nouvelle base de données
    // Vérifier plusieurs champs possibles pour les catégories
    const categoryChecks = [
      !product.category_id || product.category_id === null,
      !product.categories || product.categories.length === 0,
      !product.categories_refs || product.categories_refs.length === 0,
      !product.category_ref || product.category_ref === null,
      !product.category_info || !product.category_info.primary,
    ];

    // Un produit n'a pas de catégorie si TOUS les champs sont vides/null
    return categoryChecks.every((check) => check === true);
  }
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

    let produitsSansCategorie = [];

    products.forEach((product) => {
      if (hasNoCategory(product, source)) {
        // Adapter les champs selon la source
        let sku, designation;

        if (source === 'old') {
          sku = product.reference || 'N/A';
          designation = product.designation || 'N/A';
        } else {
          sku = product.sku || product.reference || 'N/A';
          designation = product.name || product.designation || 'N/A';
        }

        produitsSansCategorie.push({
          sku: sku,
          designation: designation,
        });
      }
    });

    console.log('\n📊 [STATISTIQUES]');
    console.log('=================');
    console.log(`Produits sans catégorie: ${produitsSansCategorie.length}`);
    console.log(
      `Pourcentage: ${((produitsSansCategorie.length / products.length) * 100).toFixed(2)}%`
    );

    if (produitsSansCategorie.length > 0) {
      // Créer le dossier export s'il n'existe pas
      const exportPath = path.join(__dirname, '../../data/export');
      if (!fs.existsSync(exportPath)) {
        fs.mkdirSync(exportPath, { recursive: true });
      }

      // Créer le fichier avec indication de la source
      console.log(`🔍 [DEBUG] Création fichier avec source: "${source}"`);
      const fileName = createFileName('produits-sans-categorie', source);
      console.log(`🔍 [DEBUG] Nom de fichier généré: "${fileName}"`);
      const filePath = path.join(exportPath, fileName);

      const sourceText = source === 'old' ? 'ancienne base de données' : 'base de données actuelle';
      let fileContent = createFileHeader(
        `Produits sans catégorie - ${sourceText}`,
        produitsSansCategorie.length
      );

      // Ajouter les statistiques dans le fichier
      fileContent += `# STATISTIQUES:\n`;
      fileContent += `# - Total produits analysés: ${products.length}\n`;
      fileContent += `# - Produits sans catégorie: ${produitsSansCategorie.length} (${((produitsSansCategorie.length / products.length) * 100).toFixed(2)}%)\n`;
      fileContent += `#\n\n`;

      produitsSansCategorie.forEach((item) => {
        fileContent += `${item.sku} | ${item.designation}\n`;
      });

      fs.writeFileSync(filePath, fileContent, 'utf8');

      console.log(`\n✅ [EXPORT] Rapport généré: ${fileName}`);
      console.log(`📄 [EXPORT] ${produitsSansCategorie.length} produits exportés`);

      // Afficher quelques exemples
      console.log('\n📝 [EXEMPLES] Premiers produits sans catégorie:');
      produitsSansCategorie.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.sku} | ${item.designation}`);
      });

      if (produitsSansCategorie.length > 5) {
        console.log(`  ... et ${produitsSansCategorie.length - 5} autres dans le fichier`);
      }
    } else {
      console.log('\n✅ [INFO] Tous les produits ont une catégorie assignée');
    }
  } catch (error) {
    console.error('❌ [ERREUR] Erreur lors de la génération du rapport:', error);
    throw error;
  }
}

module.exports = { generateReport };

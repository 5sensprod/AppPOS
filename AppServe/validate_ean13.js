const fs = require('fs');
const path = require('path');

// Chemin vers la base de données source
const sourceDbPath = path.join('data', 'source', 'products.db');

// Fonction pour lire et parser une base de données NeDB
function readDatabase(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter((item) => item !== null);
  } catch (error) {
    console.error(`Erreur lecture ${filePath}:`, error.message);
    return [];
  }
}

// Fonction pour calculer la clé de contrôle EAN13
function calculateEAN13CheckDigit(code12) {
  const digits = code12.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

// Fonction pour valider et corriger un EAN13
function validateAndCorrect(gencode) {
  if (!gencode || typeof gencode !== 'string') {
    return null;
  }

  const cleanCode = gencode.replace(/[^0-9]/g, '');

  // Code valide de 13 chiffres
  if (cleanCode.length === 13) {
    const code12 = cleanCode.substring(0, 12);
    const providedCheck = parseInt(cleanCode[12]);
    const calculatedCheck = calculateEAN13CheckDigit(code12);

    if (providedCheck === calculatedCheck) {
      return null; // Valide, pas de correction nécessaire
    } else {
      return code12 + calculatedCheck; // Correction de la clé
    }
  }

  // Code de 12 chiffres (manque la clé)
  if (cleanCode.length === 12) {
    const checkDigit = calculateEAN13CheckDigit(cleanCode);
    return cleanCode + checkDigit;
  }

  // Code trop court (8-11 chiffres) - compléter avec des 0
  if (cleanCode.length >= 8 && cleanCode.length < 12) {
    const paddedCode = cleanCode.padStart(12, '0');
    const checkDigit = calculateEAN13CheckDigit(paddedCode);
    return paddedCode + checkDigit;
  }

  // Code trop long - tronquer aux 12 premiers
  if (cleanCode.length > 13) {
    const truncatedCode = cleanCode.substring(0, 12);
    const checkDigit = calculateEAN13CheckDigit(truncatedCode);
    return truncatedCode + checkDigit;
  }

  return null; // Impossible à corriger
}

// Fonction principale
function main() {
  const sourceProducts = readDatabase(sourceDbPath);

  if (sourceProducts.length === 0) {
    console.error('Aucun produit trouvé');
    return;
  }

  const invalidProducts = [];

  sourceProducts.forEach((product) => {
    if (product.gencode) {
      const correctedGencode = validateAndCorrect(product.gencode);

      if (correctedGencode) {
        invalidProducts.push({
          _id: product._id,
          reference: product.reference,
          designation: product.designation,
          marque: product.marque || product.brand,
          gencode_original: product.gencode,
          gencode_corrige: correctedGencode,
        });
      }
    }
  });

  // Sauvegarder le résultat JSON
  const outputFile = 'gencodes_invalides.json';
  fs.writeFileSync(outputFile, JSON.stringify(invalidProducts, null, 2), 'utf8');

  console.log(`${invalidProducts.length} produits avec gencodes invalides trouvés.`);
  console.log(`Résultats sauvegardés dans: ${outputFile}`);
}

// Exécuter
main();

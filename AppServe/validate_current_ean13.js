const fs = require('fs');
const path = require('path');

// Chemin vers la base de données actuelle
const currentDbPath = path.join('data', 'products.db');

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

// Fonction pour extraire le code-barres d'un produit
function getBarcode(product) {
  if (!product.meta_data || !Array.isArray(product.meta_data)) {
    return null;
  }

  const barcodeItem = product.meta_data.find((item) => item.key === 'barcode');
  return barcodeItem && barcodeItem.value ? barcodeItem.value.trim() : null;
}

// Fonction pour détecter si un code ressemble à un EAN13
function looksLikeEAN13(barcode) {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }

  // Nettoyer le code (supprimer espaces et caractères non numériques)
  const cleanCode = barcode.replace(/[^0-9]/g, '');

  // Un code ressemble à un EAN13 s'il contient entre 8 et 15 chiffres
  // (on inclut une marge pour les codes mal formatés)
  return cleanCode.length >= 8 && cleanCode.length <= 15 && cleanCode.length > 0;
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

// Fonction pour valider un EAN13
function validateEAN13(barcode) {
  const cleanCode = barcode.replace(/[^0-9]/g, '');

  // Vérifier la longueur
  if (cleanCode.length < 12) {
    return {
      valid: false,
      error: `Trop court (${cleanCode.length} chiffres, minimum 12 pour EAN13)`,
      cleanCode: cleanCode,
    };
  }

  if (cleanCode.length > 13) {
    return {
      valid: false,
      error: `Trop long (${cleanCode.length} chiffres, maximum 13 pour EAN13)`,
      cleanCode: cleanCode,
    };
  }

  // Code de 12 chiffres (manque la clé de contrôle)
  if (cleanCode.length === 12) {
    return {
      valid: false,
      error: 'Code incomplet (12 chiffres, manque la clé de contrôle)',
      cleanCode: cleanCode,
    };
  }

  // Code de 13 chiffres - vérifier la clé de contrôle
  if (cleanCode.length === 13) {
    const code12 = cleanCode.substring(0, 12);
    const providedCheckDigit = parseInt(cleanCode[12]);
    const calculatedCheckDigit = calculateEAN13CheckDigit(code12);

    if (providedCheckDigit === calculatedCheckDigit) {
      return {
        valid: true,
        message: 'EAN13 valide',
        cleanCode: cleanCode,
      };
    } else {
      return {
        valid: false,
        error: `Clé de contrôle incorrecte (fournie: ${providedCheckDigit}, attendue: ${calculatedCheckDigit})`,
        cleanCode: cleanCode,
        correctCheckDigit: calculatedCheckDigit,
      };
    }
  }
}

// Fonction pour proposer une correction EAN13
function proposeEAN13Correction(barcode, validation) {
  if (validation.valid) {
    return null;
  }

  const cleanCode = validation.cleanCode;

  // Code de 12 chiffres - ajouter la clé de contrôle
  if (cleanCode.length === 12) {
    const checkDigit = calculateEAN13CheckDigit(cleanCode);
    return {
      original: barcode,
      corrected: cleanCode + checkDigit,
      reason: 'Ajout de la clé de contrôle manquante',
    };
  }

  // Code de 13 chiffres avec mauvaise clé - corriger la clé
  if (cleanCode.length === 13 && validation.correctCheckDigit !== undefined) {
    const code12 = cleanCode.substring(0, 12);
    return {
      original: barcode,
      corrected: code12 + validation.correctCheckDigit,
      reason: 'Correction de la clé de contrôle',
    };
  }

  // Code trop court (8-11 chiffres) - compléter avec des 0 à gauche
  if (cleanCode.length >= 8 && cleanCode.length < 12) {
    const paddedCode = cleanCode.padStart(12, '0');
    const checkDigit = calculateEAN13CheckDigit(paddedCode);
    return {
      original: barcode,
      corrected: paddedCode + checkDigit,
      reason: `Complété avec des zéros à gauche (${cleanCode.length} → 13 chiffres)`,
    };
  }

  // Code trop long (14-15 chiffres) - tronquer aux 12 premiers
  if (cleanCode.length > 13 && cleanCode.length <= 15) {
    const truncatedCode = cleanCode.substring(0, 12);
    const checkDigit = calculateEAN13CheckDigit(truncatedCode);
    return {
      original: barcode,
      corrected: truncatedCode + checkDigit,
      reason: `Tronqué aux 12 premiers chiffres (${cleanCode.length} → 13 chiffres)`,
    };
  }

  return {
    original: barcode,
    corrected: null,
    reason: 'Impossible de corriger automatiquement',
  };
}

// Fonction principale
function main() {
  console.log('🔍 Analyse des codes-barres EAN13 dans la base actuelle...\n');

  // Lire la base de données actuelle
  const currentProducts = readDatabase(currentDbPath);
  console.log(`📖 ${currentProducts.length} produits trouvés dans la base actuelle`);

  if (currentProducts.length === 0) {
    console.error('❌ Aucun produit trouvé');
    return;
  }

  // Analyser les codes-barres
  let totalWithBarcode = 0;
  let ean13LikeCount = 0;
  let validEAN13Count = 0;
  let invalidEAN13 = [];

  currentProducts.forEach((product) => {
    const barcode = getBarcode(product);

    if (barcode) {
      totalWithBarcode++;

      // Vérifier si ça ressemble à un EAN13
      if (looksLikeEAN13(barcode)) {
        ean13LikeCount++;

        // Valider le EAN13
        const validation = validateEAN13(barcode);

        if (validation.valid) {
          validEAN13Count++;
        } else {
          // Proposer une correction
          const correction = proposeEAN13Correction(barcode, validation);

          invalidEAN13.push({
            _id: product._id,
            name: product.name,
            sku: product.sku,
            brand: product.brand_ref ? product.brand_ref.name : null,
            barcode_original: barcode,
            barcode_clean: validation.cleanCode,
            error: validation.error,
            correction: correction,
          });
        }
      }
    }
  });

  // Afficher les statistiques
  console.log('\n📊 STATISTIQUES:');
  console.log(`   • Produits total: ${currentProducts.length}`);
  console.log(`   • Avec code-barres: ${totalWithBarcode}`);
  console.log(`   • Ressemblant à EAN13: ${ean13LikeCount}`);
  console.log(`   • EAN13 valides: ${validEAN13Count}`);
  console.log(`   • EAN13 invalides: ${invalidEAN13.length}\n`);

  // Sauvegarder les résultats
  const outputFile = 'ean13_invalides_current.json';

  try {
    fs.writeFileSync(outputFile, JSON.stringify(invalidEAN13, null, 2), 'utf8');
    console.log(
      `💾 ${invalidEAN13.length} codes-barres EAN13 invalides sauvegardés dans: ${outputFile}`
    );
  } catch (error) {
    console.error(`❌ Erreur sauvegarde: ${error.message}`);
  }

  // Afficher un aperçu des problèmes
  if (invalidEAN13.length > 0) {
    console.log('\n❌ APERÇU DES CODES-BARRES EAN13 INVALIDES:');
    console.log('='.repeat(80));

    invalidEAN13.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name || 'Sans nom'}`);
      console.log(`   • Code actuel: "${item.barcode_original}"`);
      console.log(`   • Problème: ${item.error}`);
      if (item.correction && item.correction.corrected) {
        console.log(`   • Correction: "${item.correction.corrected}" (${item.correction.reason})`);
      }
      console.log('-'.repeat(40));
    });

    if (invalidEAN13.length > 5) {
      console.log(`... et ${invalidEAN13.length - 5} autres dans le fichier JSON`);
    }
  }

  console.log('\n✅ Analyse terminée !');
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main, looksLikeEAN13, validateEAN13, proposeEAN13Correction };

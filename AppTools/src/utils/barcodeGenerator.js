// AppTools/src/utils/barcodeGenerator.js

/**
 * Calcule la clé de contrôle (13ème chiffre) pour un code EAN-13
 * @param {string} code12 - Les 12 premiers chiffres du code EAN-13
 * @returns {number} - Le chiffre de contrôle (0-9)
 */
function calculateCheckDigit(code12) {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error('Le code doit contenir exactement 12 chiffres');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i]);
    // Multiplier par 1 pour les positions impaires (index pair), par 3 pour les positions paires (index impair)
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

/**
 * Génère un code-barres EAN-13 valide
 * @param {Object} options - Options de génération
 * @param {string} [options.prefix='200'] - Préfixe du code (3 chiffres par défaut)
 * @param {string} [options.productId] - ID du produit pour générer un code unique
 * @param {boolean} [options.includeTimestamp=true] - Inclure un timestamp pour l'unicité
 * @returns {string} - Code EAN-13 complet (13 chiffres)
 */
export function generateEAN13(options = {}) {
  const {
    prefix = '200', // Préfixe par défaut pour codes internes
    productId,
    includeTimestamp = true,
  } = options;

  // Validation du préfixe
  if (!/^\d{3}$/.test(prefix)) {
    throw new Error('Le préfixe doit contenir exactement 3 chiffres');
  }

  let code12 = prefix;

  // Ajouter l'ID du produit si fourni
  if (productId) {
    // Convertir l'ID en nombre et le formatter sur 6 chiffres
    const numericId = parseInt(productId.replace(/\D/g, '')) || 0;
    code12 += numericId.toString().padStart(6, '0').slice(-6);
  } else if (includeTimestamp) {
    // Utiliser un timestamp pour l'unicité (6 derniers chiffres)
    const timestamp = Date.now().toString();
    code12 += timestamp.slice(-6);
  } else {
    // Générer 6 chiffres aléatoirement
    for (let i = 0; i < 6; i++) {
      code12 += Math.floor(Math.random() * 10);
    }
  }

  // Si le code fait plus de 12 caractères, le tronquer
  if (code12.length > 12) {
    code12 = code12.slice(0, 12);
  }

  // Si le code fait moins de 12 caractères, le compléter avec des zéros
  code12 = code12.padEnd(12, '0');

  // Calculer et ajouter la clé de contrôle
  const checkDigit = calculateCheckDigit(code12);
  return code12 + checkDigit;
}

/**
 * Valide un code EAN-13
 * @param {string} ean13 - Code EAN-13 à valider
 * @returns {boolean} - True si le code est valide
 */
export function validateEAN13(ean13) {
  if (!/^\d{13}$/.test(ean13)) {
    return false;
  }

  const code12 = ean13.slice(0, 12);
  const providedCheckDigit = parseInt(ean13[12]);
  const calculatedCheckDigit = calculateCheckDigit(code12);

  return providedCheckDigit === calculatedCheckDigit;
}

/**
 * Génère plusieurs codes EAN-13 uniques
 * @param {number} count - Nombre de codes à générer
 * @param {Object} options - Options de génération (voir generateEAN13)
 * @returns {string[]} - Tableau de codes EAN-13
 */
export function generateMultipleEAN13(count, options = {}) {
  const codes = new Set();

  while (codes.size < count) {
    const code = generateEAN13({
      ...options,
      includeTimestamp: true, // Forcer le timestamp pour l'unicité
    });
    codes.add(code);

    // Petit délai pour éviter les doublons de timestamp
    if (codes.size < count) {
      // Attendre 1ms pour changer le timestamp
      const start = Date.now();
      while (Date.now() === start) {
        // Boucle vide pour attendre
      }
    }
  }

  return Array.from(codes);
}

/**
 * Formate un code EAN-13 pour l'affichage
 * @param {string} ean13 - Code EAN-13
 * @returns {string} - Code formaté avec espaces
 */
export function formatEAN13(ean13) {
  if (!/^\d{13}$/.test(ean13)) {
    return ean13;
  }

  // Format: X XXXXXX XXXXXX X
  return `${ean13[0]} ${ean13.slice(1, 7)} ${ean13.slice(7, 13)}`;
}

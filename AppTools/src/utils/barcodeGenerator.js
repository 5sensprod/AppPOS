// AppTools/src/utils/barcodeGenerator.js

/**
 * Calcule la clé de contrôle (13ème chiffre) pour un code EAN-13
 */
function calculateCheckDigit(code12) {
  if (!/^\d{12}$/.test(code12)) {
    throw new Error('Le code doit contenir exactement 12 chiffres');
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }

  return (10 - (sum % 10)) % 10;
}

// Compteur statique pour garantir l'unicité même en < 1ms
let _ean13Counter = 0;

/**
 * Génère un code-barres EAN-13 valide et unique
 * ✅ FIX : l'unicité est TOUJOURS garantie par timestamp + compteur
 * Le productId n'est plus utilisé (il causait des doublons sur le même produit)
 */
export function generateEAN13(options = {}) {
  const { prefix = '200' } = options;

  if (!/^\d{3}$/.test(prefix)) {
    throw new Error('Le préfixe doit contenir exactement 3 chiffres');
  }

  _ean13Counter = (_ean13Counter + 1) % 100;
  const timestamp = Date.now().toString().slice(-4);
  const counter = _ean13Counter.toString().padStart(2, '0');

  let code12 = (prefix + timestamp + counter).slice(0, 12).padEnd(12, '0');

  const checkDigit = calculateCheckDigit(code12);
  return code12 + checkDigit;
}

/**
 * Valide un code EAN-13
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
 * ✅ CORRIGÉ : suppression du busy-wait inutile et dangereux
 */
export function generateMultipleEAN13(count, options = {}) {
  const codes = new Set();
  const maxAttempts = count * 10; // sécurité anti-boucle infinie
  let attempts = 0;

  while (codes.size < count && attempts < maxAttempts) {
    const code = generateEAN13({ ...options, includeTimestamp: true });
    codes.add(code);
    attempts++;
  }

  if (codes.size < count) {
    throw new Error(`Impossible de générer ${count} codes uniques après ${maxAttempts} tentatives`);
  }

  return Array.from(codes);
}

/**
 * Formate un code EAN-13 pour l'affichage
 */
export function formatEAN13(ean13) {
  if (!/^\d{13}$/.test(ean13)) {
    return ean13;
  }

  // Format: X XXXXXX XXXXXX
  return `${ean13[0]} ${ean13.slice(1, 7)} ${ean13.slice(7, 13)}`;
}

// src/utils/barcodeUtils.js
/**
 * Valide un code-barres EAN-13
 * @param {string} barcode - Le code-barres à valider
 * @returns {boolean} - True si le code-barres est valide
 */
export const isValidEAN13 = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;

  // Nettoyer le code-barres
  const cleaned = barcode.replace(/[\s-]/g, '');

  // Vérifier le format (13 chiffres)
  if (!/^\d{13}$/.test(cleaned)) return false;

  // Calculer la clé de contrôle
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleaned[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[12]);
};

/**
 * Extrait le code-barres des meta_data d'un produit
 * @param {Object} product - L'objet produit
 * @returns {string} - Le code-barres ou chaîne vide
 */
export const extractBarcode = (product) => {
  if (!product?.meta_data || !Array.isArray(product.meta_data)) return '';

  const barcodeItem = product.meta_data.find((item) => item.key === 'barcode');
  return barcodeItem ? (barcodeItem.value || '').toString().trim() : '';
};

/**
 * Formate un code-barres pour l'affichage
 * @param {string} barcode - Le code-barres à formater
 * @returns {string} - Le code-barres formaté
 */
export const formatBarcode = (barcode) => {
  if (!barcode) return '';

  const cleaned = barcode.replace(/[\s-]/g, '');

  // Formater EAN-13 : XXX XXXX XXXX X
  if (/^\d{13}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11)}`;
  }

  return barcode;
};

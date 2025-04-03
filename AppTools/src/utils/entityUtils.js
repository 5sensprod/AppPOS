// src/utils/entityUtils.js
export function pluralize(word) {
  if (!word) return '';
  return word.endsWith('s') ? word : `${word}s`;
}

export function capitalize(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Transforme une liste d'entités en objet indexé par _id
 * @param {Array<Object>} items
 * @returns {Object}
 */
export const buildItemsById = (items) =>
  items.reduce((acc, item) => {
    acc[item._id] = item;
    return acc;
  }, {});

/**
 * Nettoie les données avant envoi dans une requête PUT
 * - Supprime les champs non autorisés
 * - Remplace les chaînes vides par null
 * - Traite aussi les objets imbriqués en 1er niveau
 * @param {Object} data
 * @returns {Object}
 */
export const cleanUpdateData = (data) => {
  const cleaned = { ...data };
  const forbiddenKeys = [
    '_id',
    'woo_id',
    'last_sync',
    'createdAt',
    'updatedAt',
    'image',
    'pending_sync',
    'SKU',
  ];

  forbiddenKeys.forEach((key) => delete cleaned[key]);

  Object.entries(cleaned).forEach(([key, value]) => {
    if (value === '') {
      cleaned[key] = null;
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        if (subValue === '') {
          cleaned[key][subKey] = null;
        }
      });
    }
  });

  return cleaned;
};

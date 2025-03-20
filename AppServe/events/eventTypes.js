// events/eventTypes.js
const ENTITY_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
};

// Génération dynamique d'événements pour chaque entité
function createEntityEvents(entity) {
  const result = {};
  Object.entries(ENTITY_ACTIONS).forEach(([key, action]) => {
    result[key] = `entity:${entity}:${action}`;
  });
  return result;
}

module.exports = {
  ENTITY: {
    CATEGORY: createEntityEvents('category'),
    PRODUCT: createEntityEvents('product'),
    SUPPLIER: createEntityEvents('supplier'),
    BRAND: createEntityEvents('brand'),
    // Extensible à d'autres entités
  },
  // Événements spéciaux
  CATEGORY_TREE_CHANGED: 'category:tree:changed',
  SYNC_COMPLETED: 'sync:completed',
};

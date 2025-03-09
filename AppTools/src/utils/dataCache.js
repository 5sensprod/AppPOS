// src/utils/dataCache.js

// Cache global d'application pour préserver les données entre les navigations
const dataCache = {
  entities: {},
  timestamps: {},

  // Définir des données en cache
  set(entityType, data) {
    this.entities[entityType] = data;
    this.timestamps[entityType] = Date.now();
  },

  // Récupérer des données du cache
  get(entityType) {
    return this.entities[entityType] || [];
  },

  // Vérifier si le cache est périmé
  isStale(entityType, cacheDuration = 5 * 60 * 1000) {
    if (!this.timestamps[entityType]) return true;
    return Date.now() - this.timestamps[entityType] > cacheDuration;
  },

  // Nettoyer le cache d'une entité
  invalidate(entityType) {
    delete this.entities[entityType];
    delete this.timestamps[entityType];
  },

  // Nettoyer tout le cache
  clear() {
    this.entities = {};
    this.timestamps = {};
  },
};

export default dataCache;

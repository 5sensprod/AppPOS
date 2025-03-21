// services/events/entityEvents.js
const apiEventEmitter = require('../apiEventEmitter');

// Classe utilitaire pour standardiser les événements d'entités
class EntityEventService {
  constructor(entityType) {
    this.entityType = this.standardizeEntityType(entityType);
  }

  // Normaliser le nom d'entité (singulier/pluriel)
  standardizeEntityType(entityType) {
    const singular = entityType.endsWith('s') ? entityType.slice(0, -1) : entityType;
    const entityMap = {
      category: 'categories',
      product: 'products',
      supplier: 'suppliers',
      brand: 'brands',
    };

    return entityMap[singular] || `${singular}s`;
  }

  // Événements CRUD standard
  created(data) {
    console.log(`[EVENT] Émission d'événement de création pour ${this.entityType}: ${data._id}`);
    apiEventEmitter.entityCreated(this.entityType, data);

    // Événements spéciaux pour certaines entités
    if (this.entityType === 'categories') {
      this.categoryTreeChanged();
    }

    return data;
  }

  updated(id, data) {
    console.log(`[EVENT] Émission d'événement de mise à jour pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityUpdated(this.entityType, id, data);

    // Événements spéciaux pour certaines entités
    if (this.entityType === 'categories') {
      this.categoryTreeChanged();
    }

    return data;
  }

  deleted(id) {
    console.log(`[EVENT] Émission d'événement de suppression pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityDeleted(this.entityType, id);

    // Événements spéciaux pour certaines entités
    if (this.entityType === 'categories') {
      this.categoryTreeChanged();
    }
  }

  // Événements spécifiques aux images
  imageUpdated(id, data) {
    console.log(
      `[EVENT] Émission d'événement de mise à jour d'image pour ${this.entityType}: ${id}`
    );
    apiEventEmitter.entityUpdated(this.entityType, id, data);

    // Événements spéciaux pour certaines entités
    if (this.entityType === 'categories') {
      this.categoryTreeChanged();
    }

    return data;
  }

  // Événements spécifiques aux catégories
  categoryTreeChanged() {
    if (this.entityType === 'categories') {
      console.log(`[EVENT] Émission d'événement de changement d'arborescence`);
      apiEventEmitter.categoryTreeChanged();
    }
  }

  // Événements spécifiques à la synchronisation
  syncCompleted(id, data) {
    console.log(`[EVENT] Émission d'événement de synchronisation pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityUpdated(this.entityType, id, data);

    // Événements spéciaux pour certaines entités
    if (this.entityType === 'categories') {
      this.categoryTreeChanged();
    }

    return data;
  }
}

// Fonction factory pour obtenir un service d'événements pour une entité
function getEntityEventService(entityType) {
  return new EntityEventService(entityType);
}

module.exports = {
  getEntityEventService,
  EntityEventService,
};

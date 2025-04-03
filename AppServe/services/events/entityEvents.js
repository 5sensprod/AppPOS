const apiEventEmitter = require('../apiEventEmitter');
const { standardizeEntityType } = require('../../utils/entityTypeUtils');

// Classe utilitaire pour standardiser les événements d'entités
class EntityEventService {
  constructor(entityType) {
    this.entityType = standardizeEntityType(entityType);
  }

  created(data) {
    console.log(`[EVENT] Émission d'événement de création pour ${this.entityType}: ${data._id}`);
    apiEventEmitter.entityCreated(this.entityType, data);
    if (this.entityType === 'categories') this.categoryTreeChanged();
    return data;
  }

  updated(id, data) {
    console.log(`[EVENT] Émission d'événement de mise à jour pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityUpdated(this.entityType, id, data);
    if (this.entityType === 'categories') this.categoryTreeChanged();
    return data;
  }

  deleted(id) {
    console.log(`[EVENT] Émission d'événement de suppression pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityDeleted(this.entityType, id);
    if (this.entityType === 'categories') this.categoryTreeChanged();
  }

  imageUpdated(id, data) {
    console.log(
      `[EVENT] Émission d'événement de mise à jour d'image pour ${this.entityType}: ${id}`
    );
    apiEventEmitter.entityUpdated(this.entityType, id, data);
    if (this.entityType === 'categories') this.categoryTreeChanged();
    return data;
  }

  categoryTreeChanged() {
    console.log(`[EVENT] Émission d'événement de changement d'arborescence`);
    apiEventEmitter.categoryTreeChanged();
  }

  syncCompleted(id, data) {
    console.log(`[EVENT] Émission d'événement de synchronisation pour ${this.entityType}: ${id}`);
    apiEventEmitter.entityUpdated(this.entityType, id, data);
    if (this.entityType === 'categories') this.categoryTreeChanged();
    return data;
  }

  countUpdated(id, count) {
    console.log(
      `[EVENT] Émission d'événement de mise à jour de compteur pour ${this.entityType}: ${id}, count: ${count}`
    );
    apiEventEmitter.countUpdated(this.entityType, id, count);
    return count;
  }
}

function getEntityEventService(entityType) {
  return new EntityEventService(entityType);
}

module.exports = {
  getEntityEventService,
  EntityEventService,
};

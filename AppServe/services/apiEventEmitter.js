// server/services/apiEventEmitter.js
const EventEmitter = require('events');

class ApiEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);

    this.on('newListener', (event) => {
      console.log(`[EVENT] Nouvel auditeur enregistré pour l'événement: ${event}`);
    });
  }

  entityCreated(entityType, data) {
    const standardEntityType = this.standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${standardEntityType}.created`);
    this.emit(`${standardEntityType}.created`, data);
    this.emit('entity.created', { entityType: standardEntityType, data });
  }

  entityUpdated(entityType, id, data) {
    const standardEntityType = this.standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${standardEntityType}.updated`);
    this.emit(`${standardEntityType}.updated`, { id, data });
    this.emit('entity.updated', { entityType: standardEntityType, id, data });
  }

  entityDeleted(entityType, id) {
    const standardEntityType = this.standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${standardEntityType}.deleted`);
    this.emit(`${standardEntityType}.deleted`, { id });
    this.emit('entity.deleted', { entityType: standardEntityType, id });
  }

  categoryTreeChanged() {
    console.log(`[EVENT] Émission de categories.tree.changed`);
    this.emit('categories.tree.changed', { timestamp: Date.now() });
  }

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
}

const apiEventEmitter = new ApiEventEmitter();
module.exports = apiEventEmitter;

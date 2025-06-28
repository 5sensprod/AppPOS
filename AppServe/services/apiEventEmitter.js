const EventEmitter = require('events');
const { standardizeEntityType } = require('../utils/entityTypeUtils');

class ApiEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);

    this.on('newListener', (event) => {
      console.log(`[EVENT] Nouvel auditeur enregistré pour l'événement: ${event}`);
    });
  }

  entityCreated(entityType, data) {
    const normalized = standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${normalized}.created`);
    this.emit(`${normalized}.created`, data);
    this.emit('entity.created', { entityType: normalized, data });
  }

  entityUpdated(entityType, id, data) {
    const normalized = standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${normalized}.updated`);
    this.emit(`${normalized}.updated`, { id, data });
    this.emit('entity.updated', { entityType: normalized, id, data });
  }

  entityDeleted(entityType, id) {
    const normalized = standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${normalized}.deleted`);
    this.emit(`${normalized}.deleted`, { id });
    this.emit('entity.deleted', { entityType: normalized, id });
  }

  categoryTreeChanged() {
    console.log(`[EVENT] Émission de categories.tree.changed`);
    this.emit('categories.tree.changed', { timestamp: Date.now() });
  }

  supplierTreeChanged() {
    console.log(`[EVENT] Émission de suppliers.tree.changed`);
    this.emit('suppliers.tree.changed', { timestamp: Date.now() });
  }

  countUpdated(entityType, id, count) {
    const normalized = standardizeEntityType(entityType);
    console.log(`[EVENT] Émission de ${normalized}.count.updated`);
    this.emit(`${normalized}.count.updated`, { id, count });
  }

  lcdConnectionLost(data) {
    console.log(`[EVENT] Émission de lcd.connection.lost pour port ${data.port}`);
    this.emit('lcd.connection.lost', data);
  }

  lcdConnectionRestored(data) {
    console.log(`[EVENT] Émission de lcd.connection.restored pour port ${data.port}`);
    this.emit('lcd.connection.restored', data);
  }

  lcdConnectionFailed(data) {
    console.log(`[EVENT] Émission de lcd.connection.failed pour port ${data.port}`);
    this.emit('lcd.connection.failed', data);
  }

  stockStatisticsChanged(data) {
    console.log(`[EVENT] Émission de stock.statistics.changed`);
    this.emit('stock.statistics.changed', { data, timestamp: Date.now() });
  }
}

const apiEventEmitter = new ApiEventEmitter();
module.exports = apiEventEmitter;

// services/BaseEntityService.js
const eventBus = require('../events/eventBus');
const EVENTS = require('../events/eventTypes');

class BaseEntityService {
  constructor(repository, entityType) {
    this.repository = repository;
    this.entityType = entityType;
    this.events = EVENTS.ENTITY[entityType.toUpperCase()];
  }

  async findAll() {
    return await this.repository.findAll();
  }

  async findById(id) {
    return await this.repository.findById(id);
  }

  async create(data) {
    const result = await this.repository.create(data);
    eventBus.emit(this.events.CREATED, { data: result });
    return result;
  }

  async update(id, data) {
    const result = await this.repository.update(id, data);
    eventBus.emit(this.events.UPDATED, { id, data: result });
    return result;
  }

  async delete(id) {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw { status: 404, message: 'Entité non trouvée' };
    }

    const result = await this.repository.delete(id);
    eventBus.emit(this.events.DELETED, { id });
    return result;
  }
}

module.exports = BaseEntityService;

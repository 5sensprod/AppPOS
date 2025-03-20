// repositories/BaseRepository.js
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll() {
    return await this.model.findAll();
  }
  async findById(id) {
    return await this.model.findById(id);
  }
  async create(data) {
    return await this.model.create(data);
  }
  async update(id, data) {
    return await this.model.update(id, data);
  }
  async delete(id) {
    return await this.model.delete(id);
  }
}

module.exports = BaseRepository;

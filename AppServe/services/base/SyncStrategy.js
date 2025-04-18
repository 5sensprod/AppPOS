// services/base/SyncStrategy.js
class SyncStrategy {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  // Méthodes à implémenter par les classes enfants
  _mapWooCommerceToLocal(wcEntity) {
    throw new Error('_mapWooCommerceToLocal must be implemented');
  }

  _mapLocalToWooCommerce(localEntity) {
    throw new Error('_mapLocalToWooCommerce must be implemented');
  }

  // Méthodes communes que les stratégies spécifiques peuvent surcharger si nécessaire
  async syncToWooCommerce(entity, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = this._mapLocalToWooCommerce(entity);

      if (entity.woo_id) {
        await client.put(`${this.endpoint}/${entity.woo_id}`, wcData);
        results.updated++;
      } else {
        const response = await client.post(this.endpoint, wcData);
        entity.woo_id = response.data.id;
        results.created++;
      }

      return { success: true, entity, results };
    } catch (error) {
      results.errors.push({
        entity_id: entity._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async deleteEntity(entity, client) {
    if (entity.woo_id) {
      if (entity.image?.wp_id) {
        await client.deleteMedia(entity.image.wp_id);
      }
      await client.delete(`${this.endpoint}/${entity.woo_id}`, { force: true });
    }
    return { success: true };
  }

  async syncEntityList(
    input,
    model,
    client,
    eventService,
    results = { created: 0, updated: 0, deleted: 0, errors: [] },
    entityKey = 'entity'
  ) {
    const entities = Array.isArray(input) ? input : [input];

    for (const entity of entities) {
      try {
        const result = await this.syncToWooCommerce(entity, client, results);
        if (!result.success) {
          results.errors.push({
            entity_id: entity._id,
            error: result.error?.message || 'Erreur inconnue',
          });
        } else if (result[entityKey]) {
          eventService?.syncCompleted?.(entity._id, result[entityKey]);
        }
      } catch (error) {
        results.errors.push({
          entity_id: entity._id,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      data: await Promise.all(entities.map((e) => model.findById(e._id))),
      ...results,
    };
  }
}

module.exports = SyncStrategy;

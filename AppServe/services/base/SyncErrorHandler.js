// services/base/SyncErrorHandler.js
class SyncErrorHandler {
  constructor(logger = console) {
    this.logger = logger;
  }

  handleError(error, entityType, entityId) {
    const errorInfo = {
      entity_id: entityId,
      type: entityType,
      message: error.message,
      details: error.response?.data,
    };

    this.logger.error(`Sync Error [${entityType}:${entityId}]:`, error);

    return errorInfo;
  }

  handleSyncError(error, results, entityId) {
    this.logger.error('WC Error:', error.response?.data || error.message);

    results.errors.push({
      entity_id: entityId,
      error: error.response?.data?.message || error.message,
    });

    return results;
  }
}

module.exports = SyncErrorHandler;

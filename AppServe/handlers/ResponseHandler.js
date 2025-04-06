// handlers/ResponseHandler.js
class ResponseHandler {
  static success(res, data, status = 200) {
    return res.status(status).json({
      success: true,
      data,
    });
  }

  static created(res, data) {
    return this.success(res, data, 201);
  }

  static error(res, error, status = 500) {
    return res.status(status).json({
      success: false,
      error: error.message,
    });
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, { message }, 404);
  }

  static badRequest(res, data) {
    // Si data est un objet avec message et d'autres champs, on les conserve
    if (typeof data === 'object' && data !== null) {
      const { message, ...otherData } = data;
      return res.status(400).json({
        success: false,
        error: message,
        details: otherData, // Inclut les détails supplémentaires
      });
    }
    // Sinon, on traite comme avant
    return this.error(res, { message: data.message || data }, 400);
  }

  static partialSuccess(res, data, syncError) {
    return res.status(207).json({
      success: true,
      data,
      sync_status: 'failed',
      sync_error: syncError.message,
    });
  }
}

module.exports = ResponseHandler;

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

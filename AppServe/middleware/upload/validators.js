// src/middleware/upload/validators.js
class ImageUploadValidator {
  constructor(imageHandler) {
    this.imageHandler = imageHandler;
  }

  validateSingle(file) {
    this.imageHandler.validateFile(file);
  }

  validateMultiple(files) {
    files.forEach((file) => this.imageHandler.validateFile(file));
  }

  getMiddleware() {
    return (req, res, next) => {
      if (!req.file && !req.files) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      try {
        req.files ? this.validateMultiple(req.files) : this.validateSingle(req.file);
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = (imageHandler) => new ImageUploadValidator(imageHandler).getMiddleware();

//  middleware/upload/handlers.js
const multer = require('multer');
const createMulterConfig = require('./config');
const createImageValidator = require('./validators');
const SingleImage = require('../../models/images/SingleImage');
const GalleryImage = require('../../models/images/GalleryImage');

class ImageUploadHandler {
  constructor(entity) {
    this.entity = entity;
    this.imageHandler = this.createImageHandler(entity);
    this.multerConfig = createMulterConfig(this.imageHandler);
    this.validator = createImageValidator(this.imageHandler);
    this.uploader = multer(this.multerConfig);
  }

  createImageHandler(entity) {
    return entity === 'products' ? new GalleryImage() : new SingleImage(entity);
  }

  getMiddleware() {
    return {
      single: [this.uploader.single('image'), this.validator],
      array: [this.uploader.array('images', this.imageHandler.maxFiles), this.validator],
    };
  }
}

module.exports = (entity) => new ImageUploadHandler(entity).getMiddleware();

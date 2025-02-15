// src/models/images/SingleImage.js
// SingleImage.js
const BaseImageHandler = require('../base/BaseImageHandler');

class SingleImage extends BaseImageHandler {
  constructor(entity) {
    super(entity);
    this.maxFiles = 1;
    this.isGallery = false;
  }
}

module.exports = SingleImage;

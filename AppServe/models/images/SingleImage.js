const ImageEntityHandler = require('../base/ImageEntityHandler');

class SingleImage extends ImageEntityHandler {
  constructor(entity) {
    super(entity);
    this.maxFiles = 1;
    this.isGallery = false;
  }
}

module.exports = SingleImage;

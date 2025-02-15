const BaseImageRoutes = require('./base/BaseImageRoutes');

class ProductImageRoutes extends BaseImageRoutes {
  constructor() {
    super('products', { type: 'gallery' });
  }
}

module.exports = new ProductImageRoutes().getRouter();

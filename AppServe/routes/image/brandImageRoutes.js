//routes/image/brandImageRoutes.js

const BaseImageRoutes = require('./base/BaseImageRoutes');

class BrandImageRoutes extends BaseImageRoutes {
  constructor() {
    super('brands');
  }
}

module.exports = new BrandImageRoutes().getRouter();

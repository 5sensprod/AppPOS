//routes/image/categoryImageRoutes.js
const BaseImageRoutes = require('./base/BaseImageRoutes');

class CategoryImageRoutes extends BaseImageRoutes {
  constructor() {
    super('categories');
  }
}

module.exports = new CategoryImageRoutes().getRouter();

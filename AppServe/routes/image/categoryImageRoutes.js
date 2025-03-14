//routes/image/categoryImageRoutes.js
const BaseImageRoutes = require('./base/BaseImageRoutes');

class CategoryImageRoutes extends BaseImageRoutes {
  constructor() {
    super('categories', { type: 'single' });
  }
}

module.exports = new CategoryImageRoutes().getRouter();

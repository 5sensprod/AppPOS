// routes/image/supplierImageRoutes.js
const BaseImageRoutes = require('./base/BaseImageRoutes');

class SupplierImageRoutes extends BaseImageRoutes {
  constructor() {
    super('suppliers');
  }
}

module.exports = new SupplierImageRoutes().getRouter();

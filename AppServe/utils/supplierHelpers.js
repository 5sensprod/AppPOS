// AppServe/utils/supplierHelpers.js
const db = require('../config/database');

function buildSupplierPathFlat(supplier, brand) {
  return {
    path: [supplier.name, brand.name],
    path_ids: [supplier._id, brand._id],
  };
}

module.exports = {
  buildSupplierPathFlat,
};

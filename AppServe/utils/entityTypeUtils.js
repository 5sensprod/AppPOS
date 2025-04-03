function standardizeEntityType(entityName) {
  // Permet de passer un model (class) ou un string
  const rawName =
    typeof entityName === 'string'
      ? entityName.toLowerCase().replace(/model$/, '')
      : entityName.constructor?.name?.toLowerCase().replace(/model$/, '');

  const singular = rawName.endsWith('s') ? rawName.slice(0, -1) : rawName;

  const entityMap = {
    category: 'categories',
    product: 'products',
    supplier: 'suppliers',
    brand: 'brands',
  };

  return entityMap[singular] || (rawName.endsWith('s') ? rawName : `${rawName}s`);
}

module.exports = {
  standardizeEntityType,
};

// src/features/products/utils/productSearchProcessor.js
export const productSearchProcessor = (products, searchTerm, searchFields = []) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return products;
  }

  const term = searchTerm.toLowerCase().trim();

  const results = products.filter((product) => {
    // 1. Recherche dans les champs standards (name, sku, designation, etc.)
    const standardFieldsMatch =
      searchFields && searchFields.length > 0
        ? searchFields.some((field) => {
            const value = product[field];
            if (typeof value === 'string') {
              return value.toLowerCase().includes(term);
            }
            if (typeof value === 'number') {
              return value.toString().includes(term);
            }
            return false;
          })
        : false;

    // 2. Recherche dans les catégories si présentes
    const categoryMatch =
      product.category_info?.primary?.name?.toLowerCase().includes(term) ||
      product.category_info?.primary?.path_string?.toLowerCase().includes(term);

    // 3. Recherche dans les références de marque et fournisseur
    const brandMatch = product.brand_ref?.name?.toLowerCase().includes(term);
    const supplierMatch = product.supplier_ref?.name?.toLowerCase().includes(term);

    // 4. Recherche dans le code-barre (meta_data)
    const barcodeMatch = product.meta_data?.some((meta) => {
      return meta.key === 'barcode' && meta.value && meta.value.toString().includes(term);
    });

    // Retourner true si au moins un critère correspond
    return standardFieldsMatch || categoryMatch || brandMatch || supplierMatch || barcodeMatch;
  });

  return results;
};

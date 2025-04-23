// File: AppTools/src/features/products/services/webCaptureService.js
/**
 * Construit l'URL Qwant pour la capture Web à partir des produits sélectionnés.
 * @param {Array} products
 * @param {Array<string>} selectedItemIds
 * @returns {string|null}
 */
export function buildWebCaptureUrlForProducts(products, selectedItemIds) {
  const selectedProducts = products.filter((p) => selectedItemIds.includes(p._id));
  if (selectedProducts.length === 0) return null;

  const productsData = selectedProducts.map((p) => ({
    id: p._id,
    sku: p.sku || '',
    designation: p.designation || '',
  }));

  const initial = selectedProducts[0];
  const searchTerm = (initial.designation || initial.sku || initial._id).trim();
  const encodedSearch = encodeURIComponent(searchTerm);
  const encodedData = encodeURIComponent(JSON.stringify(productsData));

  return `https://www.qwant.com/?q=${encodedSearch}#APP_PRODUCTS_DATA=${encodedData}`;
}

/**
 * Ouvre une fenêtre de capture Web via l'API preload d'Electron.
 * @param {string|null} url
 */
export function openWebCaptureWindow(url) {
  if (!url) {
    alert('Aucun produit sélectionné');
    return;
  }
  window.electronAPI.openWebCaptureWindow(url);
}

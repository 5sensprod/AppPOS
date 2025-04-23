// File: AppTools/src/features/products/hooks/useWebCapture.js
import { useCallback } from 'react';
import { buildWebCaptureUrlForProducts, openWebCaptureWindow } from '../services/webCaptureService';

/**
 * Hook pour gérer la création de fiches et la capture de contenu via WebView.
 * @param {Array} products - Liste complète des produits
 * @returns {{ handleCreateSheet: function(Array<string>): Array<string>, handleContentCapture: function(Array<string|object>): Array<string|object> }}
 */
export function useWebCapture(products) {
  /**
   * Gère la création de fiche(s) produit(s) via l'URL Qwant.
   * @param {Array<string>} selectedItemIds - IDs des produits sélectionnés
   * @returns {Array<string>} selectedItemIds
   */
  const handleCreateSheet = useCallback(
    (selectedItemIds) => {
      const url = buildWebCaptureUrlForProducts(products, selectedItemIds);
      if (!url) {
        alert('Aucun produit sélectionné pour la création de fiche');
        return selectedItemIds;
      }
      openWebCaptureWindow(url, { mode: 'sheet-creation' });
      return selectedItemIds;
    },
    [products]
  );

  /**
   * Gère la capture de contenu pour un ou plusieurs produits sélectionnés.
   * @param {Array<string|object>} selectedItems - IDs ou objets des produits sélectionnés
   * @returns {Array<string|object>} selectedItems
   */
  const handleContentCapture = useCallback(
    (selectedItems) => {
      console.log('▶️ handleContentCapture / raw selectedItems:', selectedItems);

      // 1) Normaliser en tableau d'IDs (chaine ou propriété _id/id)
      const selectedIds = selectedItems.map((item) =>
        typeof item === 'string' ? item : item._id || item.id
      );
      console.log('▶️ handleContentCapture / selectedIds:', selectedIds);

      // 2) Filtrer la liste complète des produits
      const selectedProducts = products.filter((p) => selectedIds.includes(p._id || p.id));
      console.log('▶️ Produits réellement capturés :', selectedProducts.length);

      if (selectedProducts.length === 0) {
        alert('Aucun produit capturé – vérifiez votre sélection');
        return selectedItems;
      }

      // 3) Encoder l'intégralité des objets produits pour exporter tous les items
      const payload = encodeURIComponent(JSON.stringify(selectedProducts));
      const url = `https://google.com/#APP_PRODUCTS_DATA=${payload}`;
      openWebCaptureWindow(url, { mode: 'content-capture' });
      return selectedItems;
    },
    [products]
  );

  return { handleCreateSheet, handleContentCapture };
}

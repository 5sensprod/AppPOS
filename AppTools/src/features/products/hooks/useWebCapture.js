// File: AppTools/src/features/products/hooks/useWebCapture.js
import { useCallback } from 'react';
import { buildWebCaptureUrlForProducts, openWebCaptureWindow } from '../services/webCaptureService';

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

  return { handleCreateSheet };
}

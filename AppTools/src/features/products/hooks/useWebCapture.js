// File: AppTools/src/features/products/hooks/useWebCapture.js
import { useCallback } from 'react';
import { buildWebCaptureUrlForProducts, openWebCaptureWindow } from '../services/webCaptureService';

/**
 * Hook pour gérer l'ouverture de la WebView de capture.
 * @param {Array} products
 * @returns {{ handleCreateSheet: function(Array<string>): Array<string>, openWebCapture: function(string): void }}
 */
export function useWebCapture(products) {
  const handleCreateSheet = useCallback(
    (selectedItemIds) => {
      const url = buildWebCaptureUrlForProducts(products, selectedItemIds);
      openWebCaptureWindow(url);
      return selectedItemIds;
    },
    [products]
  );

  return { handleCreateSheet, openWebCaptureWindow };
}

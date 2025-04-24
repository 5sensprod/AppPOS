// src/features/products/hooks/useCapturedProducts.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer l'état des produits capturés via WebView
 * @returns {Object} Méthodes et données pour gérer les produits capturés
 */
export function useCapturedProducts() {
  const [capturedProducts, setCapturedProducts] = useState([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  // Initialiser l'état des URLs des produits
  const [productUrls, setProductUrls] = useState({});

  // Initialisation des écouteurs pour les messages de la WebView
  useEffect(() => {
    // Écouter les mises à jour des produits capturés
    const handleCapturedProductUpdate = (data) => {
      console.log('📦 Mise à jour des produits capturés:', data);
      if (data.products) {
        setCapturedProducts(data.products);
      }
      if (data.currentProductIndex !== undefined) {
        setCurrentProductIndex(data.currentProductIndex);
      }
      if (data.productUrls) {
        setProductUrls(data.productUrls);
      }
    };

    // S'abonner aux mises à jour si l'API est disponible
    if (window.electronAPI && typeof window.electronAPI.onCapturedProductUpdate === 'function') {
      window.electronAPI.onCapturedProductUpdate(handleCapturedProductUpdate);
    } else {
      console.warn("⚠️ L'API electronAPI.onCapturedProductUpdate n'est pas disponible");
    }

    // Demander l'état initial si l'API est disponible
    if (
      window.electronAPI &&
      typeof window.electronAPI.requestCapturedProductsState === 'function'
    ) {
      window.electronAPI.requestCapturedProductsState();
    } else {
      console.warn("⚠️ L'API electronAPI.requestCapturedProductsState n'est pas disponible");
    }

    // Nettoyage
    return () => {
      // Supprimer les écouteurs si nécessaire
    };
  }, []);

  /**
   * Démarrer une session de capture pour les produits sélectionnés
   * @param {Array} products - Liste de produits à capturer
   * @param {Object} options - Options supplémentaires
   */
  const startCapture = useCallback((products, options = {}) => {
    if (!products || products.length === 0) {
      console.warn('⚠️ Pas de produits à capturer');
      return;
    }

    console.log('▶️ Démarrage capture pour', products.length, 'produits');
    setIsCapturing(true);
    setCapturedProducts(products);
    setCurrentProductIndex(0);

    // Vérifier si l'API est disponible
    if (!window.electronAPI || typeof window.electronAPI.openWebCaptureWindow !== 'function') {
      console.error("❌ L'API electronAPI.openWebCaptureWindow n'est pas disponible");
      return;
    }

    // Encoder les données produits pour l'URL
    const payload = encodeURIComponent(JSON.stringify(products));
    const url = `https://google.com/#APP_PRODUCTS_DATA=${payload}`;

    // Déterminer s'il faut réinitialiser les URLs stockées
    const resetUrls = options.resetUrls !== undefined ? options.resetUrls : true;
    if (resetUrls) {
      setProductUrls({});
    }

    // Ouvrir la fenêtre de capture
    window.electronAPI.openWebCaptureWindow(url, {
      mode: 'content-capture',
      resetUrls,
      ...options,
    });
  }, []);

  /**
   * Continuer une session de capture existante
   * @param {number} startAtIndex - Index du produit pour commencer (optionnel)
   */
  const continueCapture = useCallback(
    (startAtIndex = null) => {
      if (!capturedProducts || capturedProducts.length === 0) {
        console.warn('⚠️ Pas de produits pour continuer la capture');
        return;
      }

      console.log('▶️ Continuation de la capture pour', capturedProducts.length, 'produits');
      setIsCapturing(true);

      if (startAtIndex !== null && startAtIndex >= 0 && startAtIndex < capturedProducts.length) {
        setCurrentProductIndex(startAtIndex);
      }

      // Vérifier si l'API est disponible
      if (!window.electronAPI || typeof window.electronAPI.openWebCaptureWindow !== 'function') {
        console.error("❌ L'API electronAPI.openWebCaptureWindow n'est pas disponible");
        return;
      }

      // Encoder les données produits pour l'URL
      const payload = encodeURIComponent(JSON.stringify(capturedProducts));
      const url = `https://google.com/#APP_PRODUCTS_DATA=${payload}`;

      // Ouvrir la fenêtre de capture en préservant les URLs existantes
      window.electronAPI.openWebCaptureWindow(url, {
        mode: 'content-capture',
        resetUrls: false,
      });
    },
    [capturedProducts]
  );

  /**
   * Exporter les produits capturés au format JSON
   * @returns {Boolean} Succès de l'export
   */
  const exportCapturedProducts = useCallback(() => {
    try {
      // Vérifier si l'API est disponible
      if (!window.electronAPI || typeof window.electronAPI.exportCapturedProducts !== 'function') {
        console.error("❌ L'API electronAPI.exportCapturedProducts n'est pas disponible");
        return false;
      }

      const exportData = capturedProducts.map((p) => {
        const productId = p.id || p._id;
        return {
          id: productId,
          sku: p.sku || null,
          designation: p.designation || null,
          title: p._captured?.title || null,
          description: p._captured?.description || null,
          selections: p._captured?.selections || [],
          images: p._captured?.images || [],
          capturedUrl: productUrls[productId] || null,
        };
      });

      window.electronAPI.exportCapturedProducts(exportData);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'export des produits capturés:", error);
      return false;
    }
  }, [capturedProducts, productUrls]);

  /**
   * Récupérer le contenu capturé d'un produit spécifique
   * @param {String} productId - ID du produit
   * @returns {Object|null} Données capturées ou null si non trouvé
   */
  const getCapturedProductData = useCallback(
    (productId) => {
      const product = capturedProducts.find((p) => (p.id || p._id) === productId);
      return product?._captured || null;
    },
    [capturedProducts]
  );

  /**
   * Récupérer l'URL capturée pour un produit spécifique
   * @param {String} productId - ID du produit
   * @returns {String|null} URL capturée ou null si non trouvée
   */
  const getCapturedProductUrl = useCallback(
    (productId) => {
      return productUrls[productId] || null;
    },
    [productUrls]
  );

  /**
   * Vérifier si un produit a une URL capturée
   * @param {String} productId - ID du produit
   * @returns {Boolean} Vrai si le produit a une URL capturée
   */
  const hasStoredUrl = useCallback(
    (productId) => {
      return !!productUrls[productId];
    },
    [productUrls]
  );

  /**
   * Obtenir le statut de capture pour chaque produit
   * @returns {Array} Tableau d'objets avec l'ID du produit et son statut
   */
  const getCaptureStatus = useCallback(() => {
    return capturedProducts.map((p) => {
      const productId = p.id || p._id;
      const hasUrl = !!productUrls[productId];
      const hasContent = !!p._captured;
      const hasTitle = !!p._captured?.title;
      const hasDescription = !!p._captured?.description;
      const hasImages = !!(p._captured?.images && p._captured.images.length > 0);

      return {
        id: productId,
        sku: p.sku,
        designation: p.designation,
        hasUrl,
        hasContent,
        hasTitle,
        hasDescription,
        hasImages,
        status: hasUrl && hasContent ? 'complet' : hasUrl ? 'partiel' : 'non-capturé',
      };
    });
  }, [capturedProducts, productUrls]);

  return {
    capturedProducts,
    currentProductIndex,
    isCapturing,
    productUrls,
    startCapture,
    continueCapture,
    exportCapturedProducts,
    getCapturedProductData,
    getCapturedProductUrl,
    hasStoredUrl,
    getCaptureStatus,
  };
}

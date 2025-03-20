// src/features/products/components/ProductTable.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useProduct } from '../contexts/productContext';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import websocketService from '../../../services/websocketService';

function ProductTable(props) {
  const {
    products,
    loading: contextLoading,
    error: contextError,
    fetchProducts,
    deleteProduct,
    syncProduct,
  } = useProduct();

  const [localProducts, setLocalProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Utiliser useRef pour suivre si une opération est en cours
  const operationInProgress = useRef(false);

  // Chargement initial des données
  useEffect(() => {
    console.log('[PRODUCTS] Chargement initial des produits');
    fetchProducts();
  }, [fetchProducts]);

  // Mettre à jour l'état local lorsque les produits changent
  useEffect(() => {
    console.log(
      '[PRODUCTS] Mise à jour des produits locaux:',
      products ? products.length : 0,
      'produits'
    );
    setLocalProducts(products || []);
    setError(contextError);
  }, [products, contextError]);

  // Écouter les événements de modification de l'arborescence des catégories
  useEffect(() => {
    console.log("[PRODUCTS] Configuration de l'écouteur d'événements category_tree_changed");

    const handleCategoryTreeChange = async () => {
      console.log('[PRODUCTS] Événement category_tree_changed reçu!');

      // Éviter les requêtes simultanées
      if (operationInProgress.current) {
        console.log("[PRODUCTS] Une opération est déjà en cours, on ignore l'événement");
        return;
      }

      operationInProgress.current = true;
      setLoading(true);
      console.log('[PRODUCTS] Début du rafraîchissement des produits');

      try {
        // Ajouter un délai court pour s'assurer que le serveur a terminé ses mises à jour
        console.log(
          '[PRODUCTS] Attente de 500ms pour laisser le serveur terminer ses mises à jour'
        );
        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log('[PRODUCTS] Appel de fetchProducts()');
        await fetchProducts();
        console.log('[PRODUCTS] fetchProducts() terminé avec succès');
        setError(null);
      } catch (err) {
        console.error('[PRODUCTS] Erreur lors du rafraîchissement des produits:', err);
        setError(err.message || 'Erreur de rafraîchissement');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
        console.log('[PRODUCTS] Fin du rafraîchissement des produits');
      }
    };

    // S'abonner manuellement aux catégories pour être sûr de recevoir les événements
    websocketService.subscribe('categories');

    // S'abonner aux événements websocket
    websocketService.on('category_tree_changed', handleCategoryTreeChange);

    // Nettoyage lors de la destruction du composant
    return () => {
      console.log("[PRODUCTS] Nettoyage de l'écouteur d'événements category_tree_changed");
      websocketService.off('category_tree_changed', handleCategoryTreeChange);
    };
  }, [fetchProducts]);

  // Gestionnaire de synchronisation personnalisé pour les produits
  const handleSyncProduct = useCallback(
    async (id) => {
      // Éviter les requêtes simultanées
      if (operationInProgress.current) return;

      operationInProgress.current = true;
      setLoading(true);

      try {
        await syncProduct(id);
        // Rafraîchir les données après la synchronisation
        await fetchProducts();
      } catch (err) {
        console.error('Erreur lors de la synchronisation du produit:', err);
        setError(err.message || 'Erreur lors de la synchronisation');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [syncProduct, fetchProducts]
  );

  // Fonction pour rafraîchir les données manuellement
  const refreshData = useCallback(async () => {
    console.log('[PRODUCTS] Rafraîchissement manuel demandé');
    if (operationInProgress.current) {
      console.log(
        '[PRODUCTS] Une opération est déjà en cours, le rafraîchissement manuel est ignoré'
      );
      return;
    }

    operationInProgress.current = true;
    setLoading(true);

    try {
      console.log('[PRODUCTS] Appel de fetchProducts() pour le rafraîchissement manuel');
      await fetchProducts();
      console.log('[PRODUCTS] Rafraîchissement manuel terminé avec succès');
      setError(null);
    } catch (err) {
      console.error('[PRODUCTS] Erreur lors du rafraîchissement manuel des données:', err);
      setError(err.message || 'Erreur lors du rafraîchissement');
    } finally {
      setLoading(false);
      operationInProgress.current = false;
      console.log('[PRODUCTS] Fin du rafraîchissement manuel');
    }
  }, [fetchProducts]);

  // Configuration des filtres
  const filters = [
    {
      id: 'status',
      type: 'select',
      allLabel: 'Tous les statuts',
      options: [
        { value: 'published', label: 'Publiés' },
        { value: 'draft', label: 'Brouillons' },
        { value: 'archived', label: 'Archivés' },
      ],
    },
  ];

  // Log des produits pour le débogage
  console.log(
    '[PRODUCTS] Rendu avec',
    localProducts.length,
    'produits. Loading:',
    loading || contextLoading
  );

  return (
    <EntityTable
      data={localProducts}
      isLoading={loading || contextLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={deleteProduct}
      onSync={handleSyncProduct}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 10,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      onRefresh={refreshData}
      {...props}
    />
  );
}

export default ProductTable;

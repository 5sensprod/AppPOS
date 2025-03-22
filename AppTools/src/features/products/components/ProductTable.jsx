// src/features/products/components/ProductTable.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useProduct } from '../contexts/productContext';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityEvents } from '@/hooks/useEntityEvents';

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
    fetchProducts();
  }, [fetchProducts]);

  // Mettre à jour l'état local lorsque les produits changent
  useEffect(() => {
    setLocalProducts(products || []);
    setError(contextError);
  }, [products, contextError]);

  // Définir le gestionnaire pour les événements de catégories
  const handleCategoryTreeChange = useCallback(async () => {
    // Éviter les requêtes simultanées
    if (operationInProgress.current) {
      return;
    }

    operationInProgress.current = true;
    setLoading(true);

    try {
      // Ajouter un délai court pour s'assurer que le serveur a terminé ses mises à jour
      await new Promise((resolve) => setTimeout(resolve, 500));

      await fetchProducts();
      setError(null);
    } catch (err) {
      setError(err.message || 'Erreur de rafraîchissement');
    } finally {
      setLoading(false);
      operationInProgress.current = false;
    }
  }, [fetchProducts]);

  // Utiliser notre hook pour les événements de produits et de catégories
  useEntityEvents('product', {
    onCreated: (data) => {
      if (!operationInProgress.current) {
        fetchProducts();
      }
    },
    onUpdated: ({ entityId, data }) => {
      if (!operationInProgress.current) {
        fetchProducts();
      }
    },
    onDeleted: ({ entityId }) => {
      if (!operationInProgress.current) {
        fetchProducts();
      }
    },
    customEvents: {
      'categories.tree.changed': handleCategoryTreeChange,
    },
  });

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
        setError(err.message || 'Erreur lors de la synchronisation');
      } finally {
        setLoading(false);
        operationInProgress.current = false;
      }
    },
    [syncProduct, fetchProducts]
  );

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
      {...props}
    />
  );
}

export default ProductTable;

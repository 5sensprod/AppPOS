// src/features/products/components/ProductTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useProduct } from '../stores/productStore'; // Import depuis le store Zustand
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function ProductTable(props) {
  const {
    products,
    loading: contextLoading,
    error: contextError,
    fetchProducts,
    deleteProduct,
    syncProduct,
    initWebSocketListeners,
  } = useProduct();

  // États spécifiques aux produits
  const [localProducts, setLocalProducts] = useState([]);
  const [error, setError] = useState(null);

  // Initialiser les écouteurs WebSocket au montage du composant
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

  // Gestionnaire d'événement spécifique pour les changements d'arborescence de catégories
  const handleCategoryTreeChange = useCallback(async () => {
    // Ajouter un délai court pour s'assurer que le serveur a terminé ses mises à jour
    await new Promise((resolve) => setTimeout(resolve, 500));
    await fetchProducts();
  }, [fetchProducts]);

  // Utilisation du hook useEntityTable pour la gestion commune
  const { loading, handleDeleteEntity, handleSyncEntity } = useEntityTable({
    entityType: 'product',
    fetchEntities: fetchProducts,
    deleteEntity: deleteProduct,
    syncEntity: syncProduct,
    customEventHandlers: {
      'categories.tree.changed': handleCategoryTreeChange,
    },
  });

  // Mettre à jour l'état local lorsque les produits changent
  useEffect(() => {
    setLocalProducts(products || []);
    setError(contextError);
  }, [products, contextError]);

  // Configuration des filtres (spécifique à ce composant)
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
      onDelete={handleDeleteEntity}
      onSync={handleSyncEntity}
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

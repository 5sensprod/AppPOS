import React, { useState, useEffect } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function ProductTable(props) {
  const { deleteProduct, syncProduct } = useProduct();
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
  } = useProductDataStore();

  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  const [localProducts, setLocalProducts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (syncEnabled) {
      initWebSocket();
    }

    if (products.length === 0) {
      fetchProducts();
    }
  }, [initWebSocket, fetchProducts, products.length, syncEnabled]);

  useEffect(() => {
    setLocalProducts(products || []);
    setError(productsError);
  }, [products, productsError]);

  const {
    loading: operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'product',
    fetchEntities: fetchProducts,
    deleteEntity: async (id) => {
      console.log(`🗑️ Suppression du produit #${id}`);
      await deleteProduct(id);
    },
    syncEntity: syncEnabled
      ? async (id) => {
          console.log(`🔄 Début de synchronisation du produit #${id}`);
          try {
            await syncProduct(id);
            console.log(`✅ Fin de synchronisation du produit #${id}`);
          } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation:`, error);
            throw error;
          }
        }
      : undefined,
  });

  const isLoading = productsLoading || operationLoading;

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
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={handleDeleteEntity}
      syncEnabled={syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      onSync={handleSyncEntity}
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

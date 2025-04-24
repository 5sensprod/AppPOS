// src/features/products/components/ProductTable.jsx
import React, { useState, useEffect } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { useHierarchicalCategories } from '../../../features/categories/stores/categoryHierarchyStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import UnifiedFilterBar from '../../../components/common/EntityTable/components/UnifiedFilterBar';
import { usePaginationStore } from '@/stores/usePaginationStore';
import { useProductFilters } from '../hooks/useProductFilters';
import { useProductOperations } from '../hooks/useProductOperations';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import exportService from '../../../services/exportService';
import { useWebCapture } from '../hooks/useWebCapture';

function ProductTable(props) {
  const { deleteProduct, syncProduct } = useProduct();
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
  } = useProductDataStore();

  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  const { sync: syncEnabled } = ENTITY_CONFIG.features;
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');
  const [localProducts, setLocalProducts] = useState([]);

  const { selectedFilters, setSelectedFilters, filterOptions, filterProducts } =
    useProductFilters(products);

  const {
    error,
    setError,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
    handleBatchStatusChange,
    handleBatchCategoryChange,
    isLoading,
  } = useProductOperations({
    deleteProduct,
    syncProduct,
    fetchProducts,
    syncEnabled,
  });

  const categorySelectOptions = useCategoryOptions(hierarchicalCategories, products);

  const { handleCreateSheet } = useWebCapture(products);

  useEffect(() => {
    if (syncEnabled) initWebSocket();

    if (products.length === 0) {
      fetchProducts();
    }

    if (hierarchicalCategories.length === 0 && !categoriesLoading) {
      fetchHierarchicalCategories();
    }

    return () => {
      // Nettoyage websocket si nécessaire
    };
  }, []);

  useEffect(() => {
    setLocalProducts(products || []);
    setError(productsError);
  }, [products, productsError]);

  const filteredProducts = filterProducts(localProducts);
  const loading = productsLoading || isLoading || categoriesLoading;

  const handleProductExport = async (exportConfig) => {
    try {
      return await exportService.exportProducts(exportConfig);
    } catch (error) {
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    }
  };

  return (
    <>
      <UnifiedFilterBar
        filterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onChange={setSelectedFilters}
      />

      <EntityTable
        data={filteredProducts}
        isLoading={loading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="produit"
        entityNamePlural="produits"
        baseRoute="/products"
        searchFields={['name', 'sku', 'designation', 'category']}
        onDelete={handleDeleteEntity}
        onBatchDelete={handleBatchDeleteEntities}
        syncEnabled={syncEnabled}
        actions={['view', 'edit', 'delete', ...(syncEnabled ? ['sync'] : [])]}
        batchActions={[
          'createSheet',
          'delete',
          ...(syncEnabled ? ['sync'] : []),
          'export',
          'status',
          'category',
          'captureContent',
        ]}
        onSync={handleSyncEntity}
        onBatchSync={handleBatchSyncEntities}
        onExport={handleProductExport}
        onBatchStatusChange={handleBatchStatusChange}
        onBatchCategoryChange={handleBatchCategoryChange}
        onCreateSheet={handleCreateSheet}
        categoryOptions={categorySelectOptions}
        pagination={{
          enabled: true,
          pageSize: persistedPageSize || 10,
          showPageSizeOptions: true,
          pageSizeOptions: [5, 10, 25, 50, 100],
        }}
        defaultSort={ENTITY_CONFIG.defaultSort}
        paginationEntityId="product"
        externalActiveFilters={selectedFilters}
        {...props}
      />
    </>
  );
}

export default ProductTable;

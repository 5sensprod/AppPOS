// src/features/products/components/ProductTable.jsx
import React, { useState, useEffect } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { useHierarchicalCategories } from '../../../features/categories/stores/categoryHierarchyStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import UnifiedFilterBar from '../../../components/common/EntityTable/components/UnifiedFilterBar';
import { usePaginationStore } from '@/stores/usePaginationStore';

// Nouveaux hooks et services
import { useProductFilters } from '../hooks/useProductFilters';
import { useProductOperations } from '../hooks/useProductOperations';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import exportService from '../../../services/exportService';

function ProductTable(props) {
  // Récupération des fonctions et données des stores
  const { deleteProduct, syncProduct } = useProduct();
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
  } = useProductDataStore();

  // Store des catégories hiérarchiques
  const {
    hierarchicalCategories,
    loading: categoriesLoading,
    fetchHierarchicalCategories,
  } = useHierarchicalCategories();

  // Configuration
  const { sync: syncEnabled } = ENTITY_CONFIG.features;

  // Récupérer les paramètres de pagination persistants
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');

  // État local des produits
  const [localProducts, setLocalProducts] = useState([]);

  // Utilisation des hooks personnalisés
  const { selectedFilters, setSelectedFilters, filterOptions, filterProducts } =
    useProductFilters(products);

  const {
    error,
    setError,
    operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
    handleExport,
    handleBatchStatusChange,
    handleBatchCategoryChange,
    isLoading,
  } = useProductOperations({
    deleteProduct,
    syncProduct,
    fetchProducts,
    syncEnabled,
  });

  // Options de catégories pour les sélecteurs
  const categorySelectOptions = useCategoryOptions(hierarchicalCategories, products);

  // Initialisation et nettoyage
  useEffect(() => {
    if (syncEnabled) initWebSocket();

    // Charger les produits uniquement au montage initial
    const fetchInitialProducts = async () => {
      if (products.length === 0) {
        await fetchProducts();
      }
    };

    fetchInitialProducts();

    // Charger les catégories hiérarchiques si elles ne sont pas déjà chargées
    if (hierarchicalCategories.length === 0 && !categoriesLoading) {
      fetchHierarchicalCategories();
    }

    // Nettoyage lors du démontage du composant
    return () => {
      // Code pour fermer le websocket si nécessaire
    };
  }, []);

  // Mise à jour des produits locaux quand les produits du store changent
  useEffect(() => {
    setLocalProducts(products || []);
    setError(productsError);
  }, [products, productsError]);

  // Produits filtrés selon les critères sélectionnés
  const filteredProducts = filterProducts(localProducts);

  // État de chargement global
  const loading = productsLoading || operationLoading || categoriesLoading || isLoading;

  // Fonction d'export adaptée pour utiliser le service exportService
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
        batchActions={['delete', ...(syncEnabled ? ['sync'] : []), 'export', 'status', 'category']}
        onSync={handleSyncEntity}
        onBatchSync={handleBatchSyncEntities}
        onExport={handleProductExport}
        onBatchStatusChange={handleBatchStatusChange}
        onBatchCategoryChange={handleBatchCategoryChange}
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

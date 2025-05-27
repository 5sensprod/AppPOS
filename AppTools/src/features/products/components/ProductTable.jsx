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
    syncLoading,
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

  // Enrichir les produits avec des informations sur les chemins de catégories
  useEffect(() => {
    if (products.length > 0 && hierarchicalCategories.length > 0) {
      // Créer une carte des chemins de catégories
      const categoryPathMap = {};
      const categoryHierarchyMap = {};

      // Fonction récursive pour construire les chemins et la hiérarchie
      const buildCategoryMaps = (categories, parentPath = '', parent = null) => {
        categories.forEach((cat) => {
          const currentPath = parentPath ? `${parentPath}/${cat._id}` : cat._id;
          categoryPathMap[cat._id] = currentPath;

          // Pour chaque catégorie, stocker son parent
          categoryHierarchyMap[cat._id] = {
            path: currentPath,
            parentId: parent ? parent._id : null,
          };

          if (cat.children && cat.children.length > 0) {
            buildCategoryMaps(cat.children, currentPath, cat);
          }
        });
      };

      buildCategoryMaps(hierarchicalCategories);

      // console.log("Chemins des catégories construits:", categoryPathMap);

      // Enrichir les produits avec les informations de chemin
      const enrichedProducts = products.map((product) => {
        // Créer un objet pour stocker les chemins des catégories associées
        // Inclure TOUTES les catégories possibles pour une recherche plus efficace
        const path_info = {};

        // Fonction pour ajouter tous les chemins de catégories parents
        const addAllCategoryPaths = (catId) => {
          if (!catId || !categoryPathMap[catId]) return;

          // Ajouter le chemin de cette catégorie
          path_info[catId] = categoryPathMap[catId];

          // Ajouter tous les chemins parents potentiels
          Object.keys(categoryPathMap).forEach((potentialParentId) => {
            // Vérifier si potentialParentId est un parent de catId
            if (
              categoryPathMap[catId].startsWith(categoryPathMap[potentialParentId]) &&
              catId !== potentialParentId
            ) {
              path_info[potentialParentId] = categoryPathMap[potentialParentId];
            }
          });
        };

        // Ajouter tous les chemins pour la catégorie principale
        if (product.category_id) {
          addAllCategoryPaths(product.category_id);
        }

        // Ajouter tous les chemins pour les catégories additionnelles
        if (Array.isArray(product.categories)) {
          product.categories.forEach((catId) => {
            addAllCategoryPaths(catId);
          });
        }

        // Si les refs de catégorie existent, ajouter leurs chemins aussi
        if (product.category_info?.refs) {
          product.category_info.refs.forEach((ref) => {
            addAllCategoryPaths(ref.id);
          });
        }

        // Ajouter une propriété category_id_path au produit
        const category_id_path = product.category_id ? categoryPathMap[product.category_id] : null;

        return {
          ...product,
          category_id_path,
          category_info: {
            ...(product.category_info || {}),
            path_info,
          },
        };
      });

      // console.log("Nombre de produits enrichis:", enrichedProducts.length);
      setLocalProducts(enrichedProducts);
    } else {
      setLocalProducts(products || []);
    }

    setError(productsError);
  }, [products, hierarchicalCategories, productsError]);

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

      {/* Spinner de synchronisation */}
      {syncLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-20 z-50">
          <div className="bg-white p-4 rounded-md shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Synchronisation en cours...</span>
          </div>
        </div>
      )}

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
          'status',
          'category',
          'createSheet',
          'export',
          ...(syncEnabled ? ['sync'] : []),
          'delete',
          'captureContent',
        ]}
        showBatchActions={true}
        showActions={false}
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

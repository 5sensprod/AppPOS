// src/features/products/components/ProductTable.jsx - VERSION SIMPLIFIÉE
import React, { useState, useEffect } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { useHierarchicalCategories } from '../../../features/categories/stores/categoryHierarchyStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { usePaginationStore } from '@/stores/usePaginationStore';
import { useProductFilters } from '../hooks/useProductFilters';
import { useStockOperations } from '../hooks/useStockOperations';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { useEntityTable } from '../../../hooks/useEntityTable'; // ✅ Direct comme suppliers
import exportService from '../../../services/exportService';
import { useWebCapture } from '../hooks/useWebCapture';
import StockModal from '../../../components/common/EntityTable/components/BatchActions/components/StockModal';
import ToastContainer from '../../../components/common/EntityTable/components/BatchActions/components/ToastContainer';
import { useActionToasts } from '../../../components/common/EntityTable/components/BatchActions/hooks/useActionToasts';
import { productSearchProcessor } from '../../../utils/productSearchProcessor';

function ProductTable(props) {
  const { deleteProduct, syncProduct, updateProduct } = useProduct();
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

  // États pour la modal de stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalItems, setStockModalItems] = useState([]);

  const { sync: syncEnabled } = ENTITY_CONFIG.features;
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');
  const [localProducts, setLocalProducts] = useState([]);

  const { selectedFilters, setSelectedFilters, filterOptions, filterProducts } =
    useProductFilters(products);

  // ✅ UTILISATION DIRECTE DE useEntityTable COMME LES SUPPLIERS
  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
  } = useEntityTable({
    entityType: 'product',
    fetchEntities: fetchProducts, // ✅ WebSocket store
    deleteEntity: async (id) => {
      await deleteProduct(id); // ✅ Entity store
    },
    syncEntity: syncEnabled
      ? async (id) => {
          await syncProduct(id);
        }
      : undefined,
    // ✅ Pas besoin de batchDeleteEntities/batchSyncEntities custom
    // useEntityTable les gère automatiquement avec deleteEntity/syncEntity
  });

  // Hook pour les opérations de stock (conservé)
  const {
    handleBatchStockChange,
    loading: stockLoading,
    error: stockError,
    setError: setStockError,
  } = useStockOperations({
    updateProduct,
    fetchProducts,
  });

  const categorySelectOptions = useCategoryOptions(hierarchicalCategories, products);
  const { handleCreateSheet } = useWebCapture(products);
  const { toastActions, removeToast, updateToast } = useActionToasts();

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

  // Gérer les erreurs de stock
  useEffect(() => {
    if (stockError) {
      // Pas besoin de setError, on utilise directement l'error de useEntityTable
    }
  }, [stockError]);

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

      // Enrichir les produits avec les informations de chemin
      const enrichedProducts = products.map((product) => {
        // Créer un objet pour stocker les chemins des catégories associées
        const path_info = {};

        // Fonction pour ajouter tous les chemins de catégories parents
        const addAllCategoryPaths = (catId) => {
          if (!catId || !categoryPathMap[catId]) return;

          path_info[catId] = categoryPathMap[catId];

          Object.keys(categoryPathMap).forEach((potentialParentId) => {
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

      setLocalProducts(enrichedProducts);
    } else {
      setLocalProducts(products || []);
    }
  }, [products, hierarchicalCategories, productsError]);

  const filteredProducts = filterProducts(localProducts);
  const loading = productsLoading || operationLoading || categoriesLoading || stockLoading;

  const handleProductExport = async (exportConfig) => {
    const toastId = toastActions.export.start(
      exportConfig.selectedItems.length,
      exportConfig.format,
      'produit'
    );

    try {
      const result = await exportService.exportProducts(exportConfig);

      removeToast(toastId);
      toastActions.export.success(exportConfig.format);

      return result;
    } catch (error) {
      removeToast(toastId);
      toastActions.export.error(error.message);
      return false;
    }
  };

  // Fonction pour gérer l'action de stock depuis le dropdown
  const handleStockAction = async (selectedItems, stockAction) => {
    try {
      setStockModalItems([...selectedItems]);
      setShowStockModal(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la modal stock:", error);
      return Promise.reject(error);
    }
  };

  // Fonction pour confirmer l'action de stock depuis la modal
  const handleConfirmStockChange = async (selectedItems, action, value) => {
    try {
      await handleBatchStockChange(selectedItems, action, value);
      toastActions.stock.success(selectedItems.length, action, 'produit');
      setShowStockModal(false);
      setStockModalItems([]);

      setTimeout(async () => {
        await fetchProducts();
      }, 200);
    } catch (error) {
      toastActions.stock.error(error.message);
    }
  };

  // ✅ FONCTIONS DE BATCH SIMPLIFIÉES
  const handleBatchStatusChange = async (itemIds, newStatus) => {
    if (itemIds.length === 0) return;

    try {
      await Promise.all(itemIds.map((id) => updateProduct(id, { status: newStatus })));
      toastActions.status.success(itemIds.length, newStatus, 'produit');

      // Attendre puis recharger
      setTimeout(async () => {
        await fetchProducts();
      }, 500);
    } catch (err) {
      toastActions.status.error(err.message || String(err));
    }
  };

  const handleBatchCategoryChange = async (itemIds, categoryId, categoryName) => {
    if (itemIds.length === 0) return;

    try {
      // Utiliser updateProduct mais avec écrasement complet
      await Promise.all(
        itemIds.map((id) =>
          updateProduct(id, {
            category_id: categoryId,
            categories: [categoryId], // 🎯 Écraser complètement les catégories
          })
        )
      );

      toastActions.category.success(itemIds.length, 'produit');
      // Attendre puis recharger
      setTimeout(async () => {
        await fetchProducts();
      }, 500);
    } catch (err) {
      toastActions.category.error(err.message || String(err));
    }
  };

  return (
    <>
      <ToastContainer />

      <EntityTable
        data={filteredProducts}
        isLoading={loading}
        error={error}
        columns={ENTITY_CONFIG.columns}
        entityName="produit"
        entityNamePlural="produits"
        baseRoute="/products"
        searchFields={['name', 'sku', 'designation', 'category']}
        searchProcessor={productSearchProcessor} // 🆕 Processeur personnalisé pour code-barre
        searchPlaceholder="Rechercher produit" // 🆕 Placeholder personnalisé
        // NOUVELLES PROPS UnifiedFilterBar
        enableUnifiedFilters={true}
        unifiedFilterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onFiltersChange={setSelectedFilters}
        enableCategories={true}
        enableStatusFilter={true}
        // ✅ PROPS SIMPLIFIÉES - DIRECTES DE useEntityTable
        onDelete={handleDeleteEntity}
        onBatchDelete={handleBatchDeleteEntities}
        syncEnabled={syncEnabled}
        actions={['view', 'edit', 'delete', ...(syncEnabled ? ['sync'] : [])]}
        batchActions={[
          'status',
          'stock',
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
        onBatchStockChange={handleStockAction}
        onCreateSheet={handleCreateSheet}
        categoryOptions={categorySelectOptions}
        // syncStats pas besoin - useEntityTable gère ça
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

      {/* Modal de gestion du stock */}
      <StockModal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setStockModalItems([]);
          setStockError(null);
        }}
        onConfirm={handleConfirmStockChange}
        selectedItems={stockModalItems}
        entityName="produit"
        entityNamePlural="produits"
      />
    </>
  );
}

export default ProductTable;

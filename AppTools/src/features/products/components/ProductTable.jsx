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
import { useStockOperations } from '../hooks/useStockOperations';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import exportService from '../../../services/exportService';
import { useWebCapture } from '../hooks/useWebCapture';
import StockModal from '../../../components/common/EntityTable/components/BatchActions/components/StockModal';

function ProductTable(props) {
  const { deleteProduct, syncProduct, updateProduct } = useProduct(); // Ajouter updateProduct
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

  // Nouveau hook pour les opérations de stock
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
      setError(stockError);
    }
  }, [stockError, setError]);

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
  const loading = productsLoading || isLoading || categoriesLoading || stockLoading;

  const handleProductExport = async (exportConfig) => {
    try {
      return await exportService.exportProducts(exportConfig);
    } catch (error) {
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    }
  };

  // Nouvelle fonction pour gérer l'action de stock depuis le dropdown
  const handleStockAction = async (selectedItems, stockAction) => {
    console.log('handleStockAction appelé avec selectedItems:', selectedItems);
    console.log('Structure du premier item:', selectedItems[0]);
    console.log('Action:', stockAction);

    try {
      // Sauvegarder les items sélectionnés sans les modifier
      setStockModalItems([...selectedItems]); // Copie pour éviter les références
      setShowStockModal(true);
      return Promise.resolve(); // Retourner une Promise résolue
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la modal stock:", error);
      return Promise.reject(error);
    }
  };

  // Fonction pour confirmer l'action de stock depuis la modal
  const handleConfirmStockChange = async (selectedItems, action, value) => {
    console.log('handleConfirmStockChange appelé avec:', { selectedItems, action, value });
    try {
      await handleBatchStockChange(selectedItems, action, value);
      console.log('Mise à jour du stock réussie');
      setShowStockModal(false);
      setStockModalItems([]);

      // Rafraîchir les données avec un délai pour éviter la déselection
      setTimeout(async () => {
        await fetchProducts();
      }, 200);
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
      console.error('Erreur lors de la mise à jour du stock:', error);
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
          'stock', // Nouveau bouton stock
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
        onBatchStockChange={handleStockAction} // Nouvelle prop
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

      {/* Modal de gestion du stock */}
      <StockModal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setStockModalItems([]);
          setStockError(null); // Nettoyer les erreurs lors de la fermeture
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

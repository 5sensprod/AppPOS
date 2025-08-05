// ProductTable.jsx - INTÉGRATION fabricExportService

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useProduct, useProductDataStore } from '../stores/productStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { usePaginationStore } from '@/stores/usePaginationStore';
import { useProductFilters } from '../hooks/useProductFilters';
import { useStockOperations } from '../hooks/useStockOperations';
import { useEntityTable } from '../../../hooks/useEntityTable';
import { useCategoryUtils } from '../../../components/hooks/useCategoryUtils';
import exportService from '../../../services/exportService'; // ✅ Service classique
import fabricExportService from '../../../services/fabricExportService'; // ✅ NOUVEAU service Fabric
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
    categoriesLoading,
    fetchHierarchicalCategories,
    enrichProductWithCategories,
    getCategoryOptions,
    isReady: categoriesReady,
  } = useCategoryUtils();

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalItems, setStockModalItems] = useState([]);

  const { sync: syncEnabled } = ENTITY_CONFIG.features;
  const { getPaginationParams } = usePaginationStore();
  const { pageSize: persistedPageSize } = getPaginationParams('product');

  const enrichedProducts = useMemo(() => {
    if (!products.length || !categoriesReady) return products;

    console.log('🔄 Enrichissement des produits avec catégories...');
    return products.map(enrichProductWithCategories);
  }, [products, enrichProductWithCategories, categoriesReady]);

  const { selectedFilters, setSelectedFilters, filterOptions, filterProducts } =
    useProductFilters(enrichedProducts);

  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
  } = useEntityTable({
    entityType: 'product',
    fetchEntities: fetchProducts,
    deleteEntity: async (id) => {
      await deleteProduct(id);
    },
    syncEntity: syncEnabled
      ? async (id) => {
          await syncProduct(id);
        }
      : undefined,
  });

  const {
    handleBatchStockChange,
    loading: stockLoading,
    error: stockError,
    setError: setStockError,
  } = useStockOperations({
    updateProduct,
    fetchProducts,
  });

  const categorySelectOptions = useMemo(() => {
    return getCategoryOptions({
      format: 'flat',
      sortAlphabetically: true,
      includeEmpty: true,
    });
  }, [getCategoryOptions]);

  const { handleCreateSheet } = useWebCapture(enrichedProducts);
  const { toastActions, removeToast, updateToast } = useActionToasts();

  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      try {
        if (syncEnabled) {
          initWebSocket();
        }

        const promises = [];

        if (products.length === 0) {
          promises.push(fetchProducts());
        }

        if (hierarchicalCategories.length === 0 && !categoriesLoading) {
          promises.push(fetchHierarchicalCategories());
        }

        if (promises.length > 0) {
          await Promise.all(promises);
        }
      } catch (error) {
        console.error('Erreur initialisation ProductTable:', error);
      }
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (stockError) {
    }
  }, [stockError]);

  const filteredProducts = useMemo(() => {
    console.log('🔄 Filtrage des produits...');
    return filterProducts(enrichedProducts);
  }, [enrichedProducts, filterProducts]);

  const loading = productsLoading || operationLoading || categoriesLoading || stockLoading;

  // ✅ FONCTION D'EXPORT MISE À JOUR AVEC FABRIC
  const handleProductExport = useCallback(
    async (exportConfig) => {
      console.log('📤 Configuration export reçue:', exportConfig);
      const toastId = toastActions.export.start(
        exportConfig.selectedItems.length,
        exportConfig.format,
        'produit'
      );

      // 🎯 Déclarer les variables avant le try pour qu'elles soient accessibles partout
      let withoutPrice = [];
      let withoutBarcode = [];

      try {
        let result;

        if (exportConfig.exportType === 'labels') {
          console.log("🏷️ Export d'étiquettes via Fabric.js");
          console.log('📋 Données étiquettes avant filtrage:', exportConfig.labelData);

          // ✅ APPROCHE TOLÉRANTE : On garde tous les produits
          const allLabels = exportConfig.labelData;

          // 🔍 Analyse pour logs informatifs (sans rejet)
          withoutPrice = allLabels.filter((label) => !label.price || label.price <= 0);
          withoutBarcode = allLabels.filter((label) => !label.barcode?.trim());

          if (withoutPrice.length > 0) {
            console.warn(
              `⚠️ ${withoutPrice.length} produit(s) sans prix - seront affichés sans prix`
            );
          }

          if (withoutBarcode.length > 0) {
            console.warn(
              `⚠️ ${withoutBarcode.length} produit(s) sans code-barres - seront affichés sans code-barres`
            );
          }

          console.log(`✅ Tous les produits seront exportés: ${allLabels.length}`);

          // ✅ VÉRIFICATION MINIMALE : Au moins 1 produit sélectionné
          if (allLabels.length === 0) {
            throw new Error("Aucun produit sélectionné pour l'export d'étiquettes");
          }

          console.log('🎨 Configuration layout Fabric:', exportConfig.labelLayout);

          // ✅ APPEL DU SERVICE FABRIC POUR TOUTES LES ÉTIQUETTES
          result = await fabricExportService.exportLabelsToPDF(exportConfig);
          console.log('✅ Export étiquettes Fabric terminé:', result);
        } else {
          // ✅ Export tableau classique (service original)
          console.log('📊 Export tableau classique via exportService');
          result = await exportService.exportProducts(exportConfig);
        }

        // ✅ SUPPRESSION DU TOAST DE PROGRESSION
        removeToast(toastId);

        // ✅ TOAST DE SUCCÈS DIFFÉRENCIÉ
        if (exportConfig.exportType === 'labels') {
          // 🆕 Message informatif selon le contenu
          let successMessage = `Étiquettes ${exportConfig.format.toUpperCase()} générées`;
          const missingInfoCount = withoutPrice.length + withoutBarcode.length;
          if (missingInfoCount > 0) {
            successMessage += ` (${missingInfoCount} produit(s) avec infos manquantes)`;
          }
          toastActions.export.success(successMessage);
        } else {
          toastActions.export.success(exportConfig.format);
        }

        return result;
      } catch (error) {
        console.error('❌ Erreur export:', error);
        removeToast(toastId);

        if (exportConfig.exportType === 'labels') {
          toastActions.export.error(`Erreur export étiquettes: ${error.message}`);
        } else {
          toastActions.export.error(error.message);
        }
        return false;
      }
    },
    [toastActions, removeToast]
  );

  const handleStockAction = useCallback(async (selectedItems, stockAction) => {
    try {
      setStockModalItems([...selectedItems]);
      setShowStockModal(true);
      return Promise.resolve();
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la modal stock:", error);
      return Promise.reject(error);
    }
  }, []);

  const handleConfirmStockChange = useCallback(
    async (selectedItems, action, value) => {
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
    },
    [handleBatchStockChange, toastActions, fetchProducts]
  );

  const handleBatchStatusChange = useCallback(
    async (itemIds, newStatus) => {
      if (itemIds.length === 0) return;

      try {
        await Promise.all(itemIds.map((id) => updateProduct(id, { status: newStatus })));
        toastActions.status.success(itemIds.length, newStatus, 'produit');

        setTimeout(async () => {
          await fetchProducts();
        }, 500);
      } catch (err) {
        toastActions.status.error(err.message || String(err));
      }
    },
    [updateProduct, toastActions, fetchProducts]
  );

  const handleBatchCategoryChange = useCallback(
    async (itemIds, categoryId, categoryName) => {
      if (itemIds.length === 0) return;

      try {
        await Promise.all(
          itemIds.map((id) =>
            updateProduct(id, {
              category_id: categoryId,
              categories: [categoryId],
            })
          )
        );

        toastActions.category.success(itemIds.length, 'produit');
        setTimeout(async () => {
          await fetchProducts();
        }, 500);
      } catch (err) {
        toastActions.category.error(err.message || String(err));
      }
    },
    [updateProduct, toastActions, fetchProducts]
  );

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
        searchProcessor={productSearchProcessor}
        searchPlaceholder="Rechercher produit"
        enableUnifiedFilters={true}
        unifiedFilterOptions={filterOptions}
        selectedFilters={selectedFilters}
        onFiltersChange={setSelectedFilters}
        enableCategories={true}
        enableStatusFilter={true}
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
          'labels',
          ...(syncEnabled ? ['sync'] : []),
          'delete',
          'captureContent',
        ]}
        showBatchActions={true}
        showActions={false}
        onSync={handleSyncEntity}
        onBatchSync={handleBatchSyncEntities}
        onExport={handleProductExport} // ✅ Fonction mise à jour avec Fabric
        onBatchStatusChange={handleBatchStatusChange}
        onBatchCategoryChange={handleBatchCategoryChange}
        onBatchStockChange={handleStockAction}
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
        productsData={enrichedProducts} // ✅ Données pour étiquettes
        {...props}
      />

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

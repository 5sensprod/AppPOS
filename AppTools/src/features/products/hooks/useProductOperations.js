// hooks/useProductOperations.js - VERSION CORRIGÉE
import { useState, useCallback } from 'react';
import { useEntityTable } from '@/hooks/useEntityTable';
import apiService from '../../../services/api';
import { useProductDataStore } from '../stores/productStore';
import { useActionToasts } from '../../../components/common/EntityTable/components/BatchActions/hooks/useActionToasts';

export const useProductOperations = ({
  deleteProduct,
  syncProduct,
  updateProduct,
  fetchProducts,
  syncEnabled = false,
}) => {
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    loading: operationLoading,
    handleDeleteEntity,
    handleSyncEntity: originalHandleSyncEntity,
    handleBatchSyncEntities: originalHandleBatchSyncEntities,
    loadEntities,
  } = useEntityTable({
    entityType: 'product',
    deleteEntity: async (id) => {
      console.log(`🗑️ Suppression du produit #${id}`);
      await deleteProduct(id);
      await fetchProducts();
    },
    syncEntity: syncEnabled
      ? async (id) => {
          console.log(`🔄 Début de synchronisation du produit #${id}`);
          try {
            await syncProduct(id);
            console.log(`✅ Fin de synchronisation du produit #${id}`);
            await fetchProducts();
          } catch (error) {
            console.error(`❌ Erreur lors de la synchronisation:`, error);
            throw error;
          }
        }
      : undefined,
    batchDeleteEntities: async (ids) => {
      console.log(`🗑️ Suppression par lot de ${ids.length} produits`);
      for (const id of ids) {
        await deleteProduct(id);
      }
      await fetchProducts();
    },
    batchSyncEntities: syncEnabled
      ? async (ids) => {
          console.log(`🔄 Synchronisation par lot de ${ids.length} produits`);
          const errors = [];

          for (const id of ids) {
            try {
              await syncProduct(id);
              console.log(`✅ Produit #${id} synchronisé avec succès`);
            } catch (error) {
              console.error(`❌ Erreur lors de la synchronisation du produit #${id}:`, error);
              errors.push({ id, error: error.message || String(error) });
            }
          }

          await fetchProducts();

          if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} erreurs lors de la synchronisation par lot`, errors);
          }
        }
      : undefined,
  });

  // Nouvelle logique pour la file d'attente de synchronisation
  const [syncQueue, setSyncQueue] = useState([]);
  const [currentSyncIndex, setCurrentSyncIndex] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // CORRECTION: Utiliser les fonctions du hook useActionToasts
  const { toastActions, updateToast, removeToast } = useActionToasts();

  const handleBatchDeleteEntities = useCallback(
    async (itemIds) => {
      if (itemIds.length === 0) return;

      const toastId = toastActions.deletion.start(itemIds.length, 'produit');
      setIsLoading(true);

      try {
        for (let i = 0; i < itemIds.length; i++) {
          await deleteProduct(itemIds[i]);
          const progress = { current: i + 1, total: itemIds.length };
          updateToast(toastId, { progress });
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        removeToast(toastId);
        toastActions.deletion.success(itemIds.length, 'produit');
        await fetchProducts();
      } catch (err) {
        removeToast(toastId);
        toastActions.deletion.error(err.message, 'produit');
        setError(`Erreur de suppression: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [deleteProduct, fetchProducts, toastActions, updateToast, removeToast]
  );

  const handleBatchSyncEntities = useCallback(
    async (itemIds) => {
      if (!syncEnabled || itemIds.length === 0) return;

      const toastId = toastActions.sync.start(itemIds.length, 'produit');
      setIsSyncing(true);
      setSyncQueue(itemIds);
      setCurrentSyncIndex(0);

      try {
        for (let i = 0; i < itemIds.length; i++) {
          setCurrentSyncIndex(i);
          await syncProduct(itemIds[i]);
          toastActions.sync.updateProgress(toastId, i + 1, itemIds.length);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        removeToast(toastId);
        toastActions.sync.success(itemIds.length, 'produit');
        await fetchProducts();
      } catch (err) {
        removeToast(toastId);
        toastActions.sync.error(err.message, 'produit');
        setError(`Erreur de synchronisation: ${err.message}`);
      } finally {
        setIsSyncing(false);
        setSyncQueue([]);
        setCurrentSyncIndex(0);
      }
    },
    [syncProduct, fetchProducts, syncEnabled, toastActions, removeToast]
  );

  const handleSyncEntity = useCallback(
    async (itemId) => {
      if (!syncEnabled) return;

      const toastId = toastActions.sync.start(1, 'produit');
      setIsSyncing(true);
      setSyncQueue([itemId]);
      setCurrentSyncIndex(0);
      setError(null);

      try {
        await syncProduct(itemId);
        removeToast(toastId);
        toastActions.sync.success(1, 'produit');
        await fetchProducts();
      } catch (err) {
        removeToast(toastId);
        toastActions.sync.error(err.message, 'produit');
        setError(`Erreur de synchronisation: ${err.message}`);
      } finally {
        setIsSyncing(false);
        setSyncQueue([]);
        setCurrentSyncIndex(0);
      }
    },
    [syncProduct, fetchProducts, syncEnabled, toastActions, removeToast]
  );

  // Calculer les statistiques de la file d'attente
  const syncStats = {
    total: syncQueue.length,
    completed: currentSyncIndex,
    remaining: Math.max(0, syncQueue.length - currentSyncIndex),
    isActive: isSyncing && syncQueue.length > 0,
  };

  const handleExport = async (exportConfig) => {
    const toastId = toastActions.export.start(
      exportConfig.selectedItems?.length || 0,
      exportConfig.format || 'pdf',
      'produit'
    );

    try {
      setExportLoading(true);
      updateToast(toastId, { progress: { current: 25, total: 100, label: '% complété' } });

      await apiService.post('/api/products/export', { ...exportConfig });

      updateToast(toastId, { progress: { current: 100, total: 100, label: '% complété' } });
      await new Promise((resolve) => setTimeout(resolve, 500));

      removeToast(toastId);
      toastActions.export.success(exportConfig.format || 'pdf');

      return true;
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      removeToast(toastId);
      toastActions.export.error(error.message);
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    } finally {
      setExportLoading(false);
    }
  };

  const handleBatchStatusChange = useCallback(
    async (itemIds, newStatus) => {
      if (itemIds.length === 0) return;

      try {
        await Promise.all(itemIds.map((id) => updateProduct(id, { status: newStatus })));
        toastActions.status.success(itemIds.length, newStatus, 'produit');
        await fetchProducts();
      } catch (err) {
        // CORRECTION: Utiliser err.message au lieu de juste err
        toastActions.status.error(err.message || String(err));
        setError(`Erreur de statut: ${err.message}`);
      }
    },
    [updateProduct, fetchProducts, toastActions]
  );

  const handleBatchCategoryChange = useCallback(
    async (itemIds, categoryId, categoryName) => {
      // categoryName peut être gardé pour la logique métier
      if (itemIds.length === 0) return;

      try {
        await Promise.all(itemIds.map((id) => updateProduct(id, { category_id: categoryId })));

        // MODIFICATION: Ne plus passer categoryName, juste le count et entityName
        toastActions.category.success(itemIds.length, 'produit');

        await fetchProducts();
      } catch (err) {
        toastActions.category.error(err.message || String(err));
        setError(`Erreur de catégorie: ${err.message}`);
      }
    },
    [updateProduct, fetchProducts, toastActions]
  );

  return {
    error,
    setError,
    exportLoading,
    operationLoading,
    syncLoading,
    syncStats,
    isSyncing,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
    handleExport,
    handleBatchStatusChange,
    handleBatchCategoryChange,
    isLoading: operationLoading || exportLoading,
    toastActions,
  };
};

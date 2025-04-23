// src/features/products/hooks/useProductOperations.js
import { useState } from 'react';
import { useEntityTable } from '@/hooks/useEntityTable';
import apiService from '../../../services/api';
import { useProductDataStore } from '../stores/productStore';

export const useProductOperations = ({
  deleteProduct,
  syncProduct,
  fetchProducts,
  syncEnabled = false,
}) => {
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const {
    loading: operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
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

  const handleExport = async (exportConfig) => {
    try {
      setExportLoading(true);
      await apiService.post('/api/products/export', { ...exportConfig });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    } finally {
      setExportLoading(false);
    }
  };

  const handleBatchStatusChange = async (productIds, newStatus) => {
    try {
      console.log(`Modification du statut pour ${productIds.length} produits: ${newStatus}`);
      const { updateProductsStatus } = useProductDataStore.getState();
      await updateProductsStatus(productIds, newStatus);
      await fetchProducts();
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setError(`Erreur lors de la mise à jour du statut: ${error.message}`);
      return false;
    }
  };

  const handleBatchCategoryChange = async (productIds, categoryId) => {
    try {
      console.log(`Modification de la catégorie pour ${productIds.length} produits: ${categoryId}`);

      const response = await apiService.post('/api/products/batch-category', {
        productIds,
        categoryId,
      });

      if (response.data?.success) {
        console.log(`Catégorie modifiée avec succès: ${response.data.message}`);
        await fetchProducts();
        return true;
      } else {
        const errorMessage =
          response.data?.message || 'Erreur lors de la mise à jour des catégories';
        console.warn('Avertissement lors de la mise à jour des catégories:', errorMessage);
        setError(`Avertissement: ${errorMessage}`);

        if (response.data?.success) await fetchProducts();
        return false;
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      setError(
        `Erreur lors de la mise à jour de la catégorie: ${error.message || 'Erreur inconnue'}`
      );
      return false;
    }
  };

  return {
    error,
    setError,
    exportLoading,
    operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
    handleBatchDeleteEntities,
    handleBatchSyncEntities,
    handleExport,
    handleBatchStatusChange,
    handleBatchCategoryChange,
    isLoading: operationLoading || exportLoading,
  };
};

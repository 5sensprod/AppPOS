// src/features/products/hooks/useProductOperations.js
import { useState } from 'react';
import { useEntityTable } from '@/hooks/useEntityTable';
import apiService from '../../../services/api';
import { useProductDataStore } from '../stores/productStore';

/**
 * Hook pour gérer les opérations sur les produits (suppression, synchronisation, etc.)
 * @param {Function} deleteProduct - Fonction pour supprimer un produit
 * @param {Function} syncProduct - Fonction pour synchroniser un produit
 * @param {Function} fetchProducts - Fonction pour récupérer les produits
 * @param {Boolean} syncEnabled - Indique si la synchronisation est activée
 * @returns {Object} - Les opérations et états liés aux produits
 */
export const useProductOperations = ({
  deleteProduct,
  syncProduct,
  fetchProducts,
  syncEnabled = false,
}) => {
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Utilisation du hook entityTable pour les opérations standard
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

  /**
   * Gère l'export des produits
   * @param {Object} exportConfig - Configuration de l'export
   * @returns {Promise<Boolean>} - Succès ou échec de l'opération
   */
  const handleExport = async (exportConfig) => {
    try {
      setExportLoading(true);
      const optimizedConfig = { ...exportConfig };

      // Utilisation du service d'export
      await apiService.post('/api/products/export', optimizedConfig);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setError(`Erreur lors de l'export: ${error.message}`);
      return false;
    } finally {
      setExportLoading(false);
    }
  };

  /**
   * Gère le changement de statut par lot
   * @param {Array} productIds - IDs des produits à modifier
   * @param {String} newStatus - Nouveau statut à appliquer
   * @returns {Promise<Boolean>} - Succès ou échec de l'opération
   */
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

  /**
   * Gère le changement de catégorie par lot
   * @param {Array} productIds - IDs des produits à modifier
   * @param {String} categoryId - ID de la catégorie à appliquer
   * @returns {Promise<Boolean>} - Succès ou échec de l'opération
   */
  const handleBatchCategoryChange = async (productIds, categoryId) => {
    try {
      console.log(
        `Modification de la catégorie pour ${productIds.length} produits vers la catégorie ${categoryId}`
      );

      // Appel à l'API pour mettre à jour les catégories
      const response = await apiService.post('/api/products/batch-category', {
        productIds,
        categoryId,
      });

      // Vérifier si la réponse est un succès
      if (response.data && response.data.success) {
        console.log(`Catégorie modifiée avec succès: ${response.data.message}`);

        // Recharger les produits après la mise à jour
        await fetchProducts();

        return true;
      } else {
        const errorMessage =
          response.data?.message || 'Erreur lors de la mise à jour des catégories';
        console.warn('Avertissement lors de la mise à jour des catégories:', errorMessage);
        setError(`Avertissement: ${errorMessage}`);

        // Si la mise à jour a partiellement réussi, on recharge quand même
        if (response.data && response.data.success) {
          await fetchProducts();
        }

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

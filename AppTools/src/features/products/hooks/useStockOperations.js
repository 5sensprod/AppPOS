// hooks/useStockOperations.js
import { useState } from 'react';

export const useStockOperations = ({ updateProduct, fetchProducts }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBatchStockChange = async (selectedItems, action, value) => {
    setLoading(true);
    setError(null);

    try {
      console.log('selectedItems reçus:', selectedItems);
      console.log('action:', action, 'value:', value);

      // Créer un tableau de promesses pour toutes les mises à jour
      const updatePromises = selectedItems.map(async (item) => {
        // Meilleure extraction de l'ID - vérifier plusieurs propriétés possibles
        const productId = item._id || item.id;

        if (!productId) {
          console.error('ID du produit non trouvé dans:', item);
          throw new Error('ID du produit non trouvé');
        }

        console.log('Traitement du produit avec ID:', productId);
        console.log('Données du produit:', item);

        let updateData = {};

        switch (action) {
          case 'set':
            updateData = {
              stock: value,
              manage_stock: true, // Activer la gestion de stock automatiquement
            };
            break;

          case 'add':
            updateData = {
              stock: (item.stock || 0) + value,
              manage_stock: true,
            };
            break;

          case 'subtract':
            updateData = {
              stock: Math.max(0, (item.stock || 0) - value), // Éviter les stocks négatifs
              manage_stock: true,
            };
            break;

          case 'toggle_manage':
            updateData = {
              manage_stock: !item.manage_stock,
            };
            break;

          default:
            throw new Error(`Action de stock non reconnue: ${action}`);
        }

        console.log(`Mise à jour du produit ${productId} avec:`, updateData);
        return await updateProduct(productId, updateData);
      });

      // Attendre que toutes les mises à jour soient terminées
      const results = await Promise.all(updatePromises);
      console.log('Résultats des mises à jour:', results);

      console.log('Toutes les mises à jour de stock terminées');

      // Pas de rafraîchissement immédiat - laissé au ProductTable
      return true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du stock:', err);
      const errorMessage = err.message || 'Erreur lors de la mise à jour du stock';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    handleBatchStockChange,
    loading,
    error,
    setError,
  };
};

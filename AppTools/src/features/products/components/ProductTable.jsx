// src/features/products/components/ProductTable.jsx
import React, { useState, useEffect } from 'react';
import { useProduct } from '../stores/productStore';
import { useProductDataStore } from '../stores/productStore';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';
import { useEntityTable } from '@/hooks/useEntityTable';

function ProductTable(props) {
  // Récupérer les fonctions du store avec syncProduct explicitement
  const { deleteProduct, syncProduct } = useProduct();

  // Utiliser le nouveau store dédié
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchProducts,
    initWebSocket,
  } = useProductDataStore();

  // États locaux pour les produits
  const [localProducts, setLocalProducts] = useState([]);
  const [error, setError] = useState(null);

  // Initialiser les WebSockets et charger les données si nécessaire
  useEffect(() => {
    // Initialiser les écouteurs WebSocket
    initWebSocket();

    // Charger les produits seulement s'ils ne sont pas déjà chargés
    if (products.length === 0) {
      fetchProducts();
    }
  }, [initWebSocket, fetchProducts, products.length]);

  // Mettre à jour l'état local lorsque les produits ou les erreurs changent
  useEffect(() => {
    setLocalProducts(products || []);
    setError(productsError);
  }, [products, productsError]);

  // Utilisation du hook useEntityTable sans les abonnements WebSocket
  const {
    loading: operationLoading,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType: 'product',
    fetchEntities: fetchProducts,
    deleteEntity: async (id) => {
      console.log(`🗑️ Suppression du produit #${id}`);
      await deleteProduct(id);
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    syncEntity: async (id) => {
      // Utiliser la fonction syncProduct explicitement
      console.log(`🔄 Début de synchronisation du produit #${id}`);
      try {
        await syncProduct(id);
        console.log(`✅ Fin de synchronisation du produit #${id}`);
      } catch (error) {
        console.error(`❌ Erreur lors de la synchronisation:`, error);
        throw error;
      }
      // Le refresh se fera automatiquement via les événements WebSocket
    },
    // Ne pas spécifier de customEventHandlers pour éviter les abonnements doublons
  });

  // Combinaison de l'état de chargement
  const isLoading = productsLoading || operationLoading;

  // Configuration des filtres (spécifique à ce composant)
  const filters = [
    {
      id: 'status',
      type: 'select',
      allLabel: 'Tous les statuts',
      options: [
        { value: 'published', label: 'Publiés' },
        { value: 'draft', label: 'Brouillons' },
        { value: 'archived', label: 'Archivés' },
      ],
    },
  ];

  return (
    <EntityTable
      data={localProducts}
      isLoading={isLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={handleDeleteEntity}
      onSync={handleSyncEntity}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 10,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={ENTITY_CONFIG.defaultSort}
      {...props}
    />
  );
}

export default ProductTable;

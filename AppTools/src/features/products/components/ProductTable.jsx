// src/features/products/components/ProductTable.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useProduct } from '../contexts/productContext';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';

function ProductTable(props) {
  const {
    products,
    loading: contextLoading,
    error: contextError,
    fetchProducts,
    deleteProduct,
    syncProduct,
  } = useProduct();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localProducts, setLocalProducts] = useState([]);

  // Chargement initial des données
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Mettre à jour l'état local lorsque les produits changent
  useEffect(() => {
    setLocalProducts(products || []);
    setError(contextError);
  }, [products, contextError]);

  // Gestionnaire de synchronisation personnalisé pour les produits
  const handleSyncProduct = useCallback(
    async (id) => {
      setLoading(true);
      try {
        await syncProduct(id);
        // Rafraîchir les données après la synchronisation
        await fetchProducts();
        // Pas besoin de setLocalProducts car l'effet se déclenchera
      } catch (err) {
        console.error('Erreur lors de la synchronisation du produit:', err);
        setError(err.message || 'Erreur lors de la synchronisation');
      } finally {
        setLoading(false);
      }
    },
    [syncProduct, fetchProducts]
  );

  // Configuration des filtres
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
      isLoading={loading || contextLoading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={deleteProduct}
      onSync={handleSyncProduct} // Utiliser le gestionnaire personnalisé
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

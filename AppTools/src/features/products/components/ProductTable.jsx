// src/features/products/components/ProductTable.jsx
import React, { useEffect } from 'react';
import { useProduct } from '../contexts/productContext';
import { EntityTable } from '../../../components/common/';
import { ENTITY_CONFIG } from '../constants';

function ProductTable(props) {
  const { products, loading, error, fetchProducts, deleteProduct, syncProduct } = useProduct();

  // Chargement direct des données au montage du composant
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
      data={products || []}
      isLoading={loading}
      error={error}
      columns={ENTITY_CONFIG.columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={deleteProduct}
      onSync={syncProduct}
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

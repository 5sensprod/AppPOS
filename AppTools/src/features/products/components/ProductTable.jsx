// src/features/products/components/ProductTable.jsx
import React, { useEffect } from 'react';
import { useProduct } from '../contexts/productContext';
import { EntityTable } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { Package } from 'lucide-react';
import imageProxyService from '../../../services/imageProxyService';

function ProductTable(props) {
  const { products, loading, error, fetchProducts, deleteProduct, syncProduct } = useProduct();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Configuration des colonnes
  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (product) => (
        <div className="h-12 w-12 flex-shrink-0">
          {product.image && product.image.src ? (
            <img
              src={imageProxyService.getImageUrl(product.image.src)}
              alt={product.name}
              className="h-full w-full object-cover rounded-md"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'sku', label: 'SKU', sortable: true },
    {
      key: 'price',
      label: 'Prix',
      render: (product) => `${product.price ? product.price.toFixed(2) : '0.00'} €`,
      sortable: true,
    },
    {
      key: 'stock',
      label: 'Stock',
      render: (product) => (
        <span
          className={`${
            product.stock <= product.min_stock ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {product.stock || 0}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (product) => {
        const statusMap = {
          published: {
            label: 'Publié',
            color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          },
          draft: {
            label: 'Brouillon',
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          },
          archived: {
            label: 'Archivé',
            color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          },
        };

        const status = statusMap[product.status] || statusMap.draft;

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'sync',
      label: 'Synchronisation',
      render: (product) => (
        <span className={product.woo_id ? 'text-green-500' : 'text-gray-400'}>
          {product.woo_id ? 'Synchronisé' : 'Non synchronisé'}
        </span>
      ),
    },
  ];

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
      columns={columns}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      filters={filters}
      searchFields={['name', 'sku']}
      onDelete={deleteProduct}
      onSync={syncProduct}
      syncEnabled={true}
      actions={['view', 'edit', 'delete', 'sync']}
      batchActions={['delete', 'sync']}
      pagination={{
        enabled: true,
        pageSize: 10,
        showPageSizeOptions: true,
        pageSizeOptions: [5, 10, 25, 50],
      }}
      defaultSort={{ field: 'name', direction: 'asc' }}
      {...props}
    />
  );
}

export default ProductTable;

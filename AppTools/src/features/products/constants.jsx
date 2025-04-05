// src/features/products/constants.js
import React from 'react';
import { Package, ShoppingBag, Tag, BarChart2 } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

export const ENTITY_CONFIG = {
  entityName: 'product',
  apiEndpoint: '/api/products',
  features: {
    sync: true,
    images: true,
    hierarchy: false,
  },
  columns: [
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
    {
      key: 'sku',
      label: 'Référence',
      render: (product) => (product.sku ? product.sku : product.name),
      sortable: true,
    },
    {
      key: 'purchase_price',
      label: 'Achat',
      sortable: true,
      render: (product) =>
        `${product.purchase_price ? product.purchase_price.toFixed(2) : '0.00'} €`,
    },
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
      key: 'category',
      label: 'Catégorie',
      render: (product) => {
        if (product.category_info && product.category_info.primary) {
          return (
            <div className="flex flex-col">
              <span>{product.category_info.primary.name}</span>
              {product.category_info.primary.path.length > 1 && (
                <span className="text-xs text-gray-500">
                  {product.category_info.primary.path_string}
                </span>
              )}
              {product.category_info.refs.length > 1 && (
                <span className="text-xs text-gray-500">
                  (+{product.category_info.refs.length - 1} autres)
                </span>
              )}
            </div>
          );
        }
        return '-';
      },
      sortable: false,
    },
    {
      key: 'supplier_brand_path',
      label: 'Marque',
      render: (product) => {
        const brand = product.brand_ref?.name || '-';
        const supplier = product.supplier_ref?.name;

        return (
          <div className="flex flex-col">
            <span className=" text-gray-900 dark:text-white">{brand}</span>
            {supplier && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {supplier} › {brand}
              </span>
            )}
          </div>
        );
      },
      sortable: false,
    },
    {
      key: 'woo_status',
      label: 'Statut WEB',
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

        return (
          <div className="flex items-center space-x-2">
            {product.woo_id ? (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                Synchronisé
              </span>
            ) : (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                Non synchronisé
              </span>
            )}

            {product.pending_sync && (
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                Modifié
              </span>
            )}

            {product.woo_id && product.status && statusMap[product.status] && (
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[product.status].color}`}
              >
                {statusMap[product.status].label}
              </span>
            )}
          </div>
        );
      },
    },
  ],
  formFields: [
    { name: 'name', label: 'Nom', type: 'text', required: true },
    { name: 'sku', label: 'SKU', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
    { name: 'price', label: 'Prix', type: 'number', min: 0, step: 0.01, required: true },
    { name: 'regular_price', label: 'Prix régulier', type: 'number', min: 0, step: 0.01 },
    { name: 'sale_price', label: 'Prix promotionnel', type: 'number', min: 0, step: 0.01 },
    { name: 'purchase_price', label: "Prix d'achat", type: 'number', min: 0, step: 0.01 },
    { name: 'stock', label: 'Stock', type: 'number', min: 0, required: true },
    { name: 'min_stock', label: 'Stock minimum', type: 'number', min: 0 },
    { name: 'manage_stock', label: 'Gérer le stock', type: 'checkbox' },
    { name: 'category_id', label: 'Catégorie principale', type: 'select', options: [] },
    { name: 'categories', label: 'Catégories', type: 'multiselect', options: [] },
    { name: 'brand_id', label: 'Marque', type: 'select', options: [] },
    { name: 'supplier_id', label: 'Fournisseur', type: 'select', options: [] },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'draft', label: 'Brouillon' },
        { value: 'published', label: 'Publié' },
        { value: 'archived', label: 'Archivé' },
      ],
    },
  ],
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  icons: {
    main: Package,
    inventory: ShoppingBag,
    tag: Tag,
    reports: BarChart2,
  },
  tabs: [
    { id: 'general', label: 'Général' },
    { id: 'inventory', label: 'Inventaire' },
    { id: 'images', label: 'Images' },
    { id: 'woocommerce', label: 'Site WEB' },
  ],
};

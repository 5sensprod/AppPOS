// src/features/products/constants.js
import React from 'react';
import { Package, ShoppingBag, Tag, BarChart2 } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

export const ENTITY_CONFIG = {
  entityName: 'product',
  apiEndpoint: '/api/products',
  syncEnabled: true,
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
      key: 'woo_status',
      label: 'Statut WEB',
      render: (product) => (
        <div className="flex">
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
            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              Modifié
            </span>
          )}
        </div>
      ),
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

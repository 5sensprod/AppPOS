// src/features/categories/constants.js
import React from 'react';
import { FolderTree } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

export const ENTITY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  columns: [
    {
      key: 'image',
      label: 'Image',
      render: (category) => (
        <div className="h-10 w-10 flex-shrink-0">
          {category.image && category.image.src ? (
            <img
              src={imageProxyService.getImageUrl(category.image.src)}
              alt={category.name}
              className="h-full w-full object-cover rounded"
            />
          ) : (
            <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-xs text-gray-500">Aucune</span>
            </div>
          )}
        </div>
      ),
    },
    { key: 'name', label: 'Nom', sortable: true },
    {
      key: 'description',
      label: 'Description',
      render: (category) => <div className="max-w-xs truncate">{category.description || '-'}</div>,
    },
    {
      key: 'product_count',
      label: 'Articles',
      sortable: true,
      render: (category) => (
        <div className="text-center">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {category.product_count || 0}
          </span>
        </div>
      ),
    },
    {
      key: 'woo_status',
      label: 'Statut WEB',
      render: (category) => (
        <div className="flex">
          {category.woo_id ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Synchronisé
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Non synchronisé
            </span>
          )}
          {category.pending_sync && (
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
    { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
    { name: 'slug', label: 'Slug', type: 'text' },
    { name: 'parent_id', label: 'Catégorie parente', type: 'select', options: [] },
  ],
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  icons: {
    main: FolderTree,
  },
  tabs: [
    { id: 'general', label: 'Général' },
    { id: 'images', label: 'Images' },
    { id: 'woocommerce', label: 'Site WEB' },
  ],
};

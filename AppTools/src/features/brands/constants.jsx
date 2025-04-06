// src/features/brands/constants.js
import React from 'react';
import { BookOpen } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

export const ENTITY_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  features: {
    sync: true,
    images: true,
    hierarchy: false,
  },
  columns: [
    {
      key: 'image',
      label: 'Image',
      render: (brand) => (
        <div className="h-10 w-10 flex-shrink-0">
          {brand.image && brand.image.src ? (
            <img
              src={imageProxyService.getImageUrl(brand.image.src)}
              alt={brand.name}
              className="h-full w-full object-cover rounded-md"
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
      render: (brand) => <div className="max-w-xs truncate">{brand.description || '-'}</div>,
    },
    {
      key: 'suppliersRefs',
      label: 'Fournisseur',
      render: (brand) =>
        brand.suppliersRefs && brand.suppliersRefs.length > 0
          ? brand.suppliersRefs.map((s) => s.name).join(', ')
          : '-',
    },
    {
      key: 'woo_status',
      label: 'Statut WEB',
      render: (brand) => (
        <div className="flex">
          {brand.woo_id ? (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Synchronisé
            </span>
          ) : (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Non synchronisé
            </span>
          )}
          {brand.pending_sync && (
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
    {
      name: 'suppliers',
      label: 'Fournisseurs',
      type: 'multiselect',
      tab: 'general',
    },
  ],
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  icons: {
    main: BookOpen,
  },
  tabs: [
    { id: 'general', label: 'Général' },
    { id: 'images', label: 'Images' },
    { id: 'woocommerce', label: 'Site WEB' },
  ],
};

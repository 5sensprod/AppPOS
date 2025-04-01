// src/features/suppliers/constants.js
import React from 'react';
import { Truck, Mail, Phone, Building, User, Image, Package } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

export const ENTITY_CONFIG = {
  entityName: 'supplier',
  apiEndpoint: '/api/suppliers',
  syncEnabled: false,
  columns: [
    {
      key: 'image',
      label: 'Logo',
      render: (supplier) => (
        <div className="h-10 w-10 flex-shrink-0">
          {supplier.image && supplier.image.src ? (
            <img
              src={imageProxyService.getImageUrl(supplier.image.src)}
              alt={supplier.name}
              className="h-full w-full object-cover rounded-md"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
              <Truck className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'supplier_code', label: 'Code fournisseur', sortable: true },
    { key: 'customer_code', label: 'Code client', sortable: true },
    {
      key: 'products_count',
      label: 'Produits',
      sortable: true,
      render: (supplier) => (
        <div className="flex items-center text-sm">
          <Package className="h-4 w-4 mr-1" />
          <span>{supplier.products_count || 0}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (supplier) => (
        <div className="space-y-1">
          {supplier.contact?.name && (
            <div className="flex items-center text-sm">
              <User className="h-4 w-4 mr-1" /> {supplier.contact.name}
            </div>
          )}
          {supplier.contact?.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-1" /> {supplier.contact.email}
            </div>
          )}
          {supplier.contact?.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-1" /> {supplier.contact.phone}
            </div>
          )}
        </div>
      ),
    },
  ],
  formFields: [
    // Informations générales
    { name: 'name', label: 'Nom', type: 'text', required: true, tab: 'general' },
    {
      name: 'supplier_code',
      label: 'Code fournisseur',
      type: 'text',
      required: false,
      tab: 'general',
    },
    { name: 'customer_code', label: 'Code client', type: 'text', tab: 'general' },

    // Contact
    { name: 'contact.name', label: 'Nom du contact', type: 'text', tab: 'contact' },
    { name: 'contact.email', label: 'Email du contact', type: 'email', tab: 'contact' },
    { name: 'contact.phone', label: 'Téléphone du contact', type: 'text', tab: 'contact' },
    {
      name: 'contact.address',
      label: 'Adresse du contact',
      type: 'textarea',
      rows: 3,
      tab: 'contact',
    },

    // Informations bancaires
    { name: 'banking.iban', label: 'IBAN', type: 'text', tab: 'payment' },
    { name: 'banking.bic', label: 'BIC/SWIFT', type: 'text', tab: 'payment' },

    // Conditions de paiement
    {
      name: 'payment_terms.type',
      label: 'Type de paiement',
      type: 'select',
      tab: 'payment',
      options: [
        { value: 'immediate', label: 'Immédiat' },
        { value: '30days', label: '30 jours' },
        { value: '60days', label: '60 jours' },
        { value: '90days', label: '90 jours' },
      ],
    },
    {
      name: 'payment_terms.discount',
      label: 'Remise (%)',
      type: 'number',
      min: 0,
      max: 100,
      step: 0.1,
      tab: 'payment',
    },
  ],
  defaultSort: {
    field: 'name',
    direction: 'asc',
  },
  icons: {
    main: Truck,
    contact: User,
    payment: Building,
    images: Image,
  },
  tabs: [
    { id: 'general', label: 'Général' },
    { id: 'contact', label: 'Contact' },
    { id: 'payment', label: 'Paiement' },
    { id: 'images', label: 'Images' },
  ],
};

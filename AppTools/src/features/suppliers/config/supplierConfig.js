// src/features/suppliers/config/supplierConfig.js
import { Truck, User, CreditCard, Image } from 'lucide-react';

const supplierConfig = {
  entityName: 'fournisseur',
  entityNamePlural: 'fournisseurs',
  baseRoute: '/products/suppliers',

  tabs: [
    {
      id: 'general',
      label: 'Général',
      icon: Truck,
      sections: [
        {
          title: 'Informations de base',
          fields: [
            {
              name: 'name',
              label: 'Nom',
              type: 'text',
              required: true,
              placeholder: 'Nom du fournisseur...',
            },
            // ✂️ Temporairement commenté pour test
            // {
            //   name: 'supplier_code',
            //   label: 'Code fournisseur',
            //   type: 'text',
            //   placeholder: 'Code interne...'
            // },
            // {
            //   name: 'customer_code',
            //   label: 'Code client',
            //   type: 'text',
            //   placeholder: 'Code chez le fournisseur...'
            // }
          ],
        },
        // ✂️ Section Relations temporairement commentée
        // {
        //   title: 'Relations',
        //   fields: [
        //     {
        //       name: 'brands',
        //       label: 'Marques',
        //       type: 'multiselect',
        //       showImages: true,
        //       placeholder: 'Sélectionner des marques...',
        //       options: []
        //     }
        //   ]
        // }
      ],
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: User,
      sections: [
        {
          title: 'Informations de contact',
          fields: [
            {
              name: 'contact.name',
              label: 'Nom du contact',
              type: 'text',
              placeholder: 'Nom de la personne de contact...',
            },
            {
              name: 'contact.email',
              label: 'Email du contact',
              type: 'email',
              placeholder: 'email@fournisseur.com',
            },
            {
              name: 'contact.phone',
              label: 'Téléphone du contact',
              type: 'text',
              placeholder: '+33 1 23 45 67 89',
            },
            {
              name: 'contact.address',
              label: 'Adresse du contact',
              type: 'textarea',
              rows: 3,
              placeholder: 'Adresse complète du fournisseur...',
            },
          ],
        },
      ],
    },
    {
      id: 'payment',
      label: 'Paiement',
      icon: CreditCard,
      sections: [
        {
          title: 'Informations bancaires',
          fields: [
            {
              name: 'banking.iban',
              label: 'IBAN',
              type: 'text',
              placeholder: 'FR76 1234 5678 9012 3456 7890 123',
            },
            {
              name: 'banking.bic',
              label: 'BIC/SWIFT',
              type: 'text',
              placeholder: 'BNPAFRPP',
            },
          ],
        },
        {
          title: 'Conditions de paiement',
          fields: [
            {
              name: 'payment_terms.type',
              label: 'Type de paiement',
              type: 'select',
              options: [
                { value: 'immediate', label: 'Immédiat' },
                { value: '30days', label: '30 jours' },
                { value: '60days', label: '60 jours' },
                { value: '90days', label: '90 jours' },
              ],
            },
            {
              name: 'payment_terms.discount',
              label: 'Remise',
              type: 'number',
              min: 0,
              max: 100,
              step: 0.1,
              suffix: '%',
              placeholder: '0',
            },
          ],
        },
      ],
    },
    {
      id: 'images',
      label: 'Images',
      icon: Image,
      sections: [
        {
          title: 'Image principale',
          fields: [
            {
              name: 'image',
              label: 'Logo du fournisseur',
              type: 'image',
            },
          ],
        },
      ],
    },
  ],

  // Configuration pour le mode création (tabs visibles)
  createModeTabs: ['general'],

  // Configuration pour le mode édition (tous les tabs)
  editModeTabs: ['general', 'contact', 'payment', 'images'],

  // Mapping des champs spéciaux qui ont besoin d'options dynamiques
  specialFields: {
    brands: {
      source: 'brands', // Récupéré depuis useSupplierDetail
      type: 'multiselect',
      showImages: true,
    },
  },

  // Valeurs par défaut pour la création
  defaultValues: {
    name: '',
    supplier_code: '',
    customer_code: '',
    brands: [],
    contact: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    banking: {
      iban: '',
      bic: '',
    },
    payment_terms: {
      type: 'immediate',
      discount: 0,
    },
  },

  // Configuration des actions disponibles
  actions: {
    edit: true,
    delete: true,
    sync: false, // Pas de sync pour les suppliers
  },
};

export default supplierConfig;

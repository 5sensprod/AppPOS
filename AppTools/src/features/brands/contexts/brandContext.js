// src/features/brands/contexts/brandContext.js
import { createEntityContext } from '../../../factories/createEntityContext';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le contexte avec la factory améliorée
export const {
  brandContext: BrandContext,
  BrandProvider,
  useBrand,
  useBrandExtras,
} = createEntityContext(BRAND_CONFIG);

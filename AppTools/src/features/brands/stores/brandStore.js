// src/features/brands/stores/brandStore.js
import { createEntityStore } from '../../../factories/createEntityStore';

// Configuration de l'entité Brand
const BRAND_CONFIG = {
  entityName: 'brand',
  apiEndpoint: '/api/brands',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le store avec la factory
export const { useBrand, useEntityStore: useBrandStore } = createEntityStore(BRAND_CONFIG);

// Fonction pour exposer des méthodes supplémentaires spécifiques aux marques (si nécessaire)
export function useBrandExtras() {
  // Dans ce cas simple, nous retournons simplement les fonctionnalités de base
  return {
    ...useBrand(),
    // Vous pouvez ajouter ici des fonctionnalités spécifiques aux marques si besoin
  };
}

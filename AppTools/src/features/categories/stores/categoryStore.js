// src/features/categories/stores/categoryStore.js
import { createEntityStore } from '../../../factories/createEntityStore';
import apiService from '../../../services/api';

// Configuration de l'entité Category
const CATEGORY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le store avec la factory
export const { useCategory, useEntityStore: useCategoryStore } = createEntityStore(CATEGORY_CONFIG);

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const getHierarchicalCategories = async () => {
    try {
      const response = await apiService.get('/api/categories/hierarchical');
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors du chargement des catégories hiérarchiques:', error);
      throw error;
    }
  };

  // Retourne toutes les fonctionnalités standard du useCategory + les extras
  return {
    ...useCategory(),
    getHierarchicalCategories,
  };
}

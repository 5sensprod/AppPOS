// src/features/categories/contexts/categoryContext.js
import { createEntityContext } from '../../../factories/createEntityContext';
import apiService from '../../../services/api';

// Configuration de l'entité Category
const CATEGORY_CONFIG = {
  entityName: 'category',
  apiEndpoint: '/api/categories',
  syncEnabled: true,
  imagesEnabled: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
};

// Créer le contexte avec la factory
export const {
  categoryContext: CategoryContext,
  CategoryProvider,
  useCategory,
  useCategoryExtras: useBaseCategoryExtras,
} = createEntityContext(CATEGORY_CONFIG);

// Fonction pour exposer des méthodes supplémentaires spécifiques aux catégories
export function useCategoryExtras() {
  const baseContext = useBaseCategoryExtras();

  const getHierarchicalCategories = async () => {
    try {
      const response = await apiService.get('/api/categories/hierarchical');
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors du chargement des catégories hiérarchiques:', error);
      throw error;
    }
  };

  return {
    ...baseContext,
    getHierarchicalCategories,
  };
}

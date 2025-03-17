// src/features/categories/CategoriesPage.jsx
import React from 'react';
import { CategoryProvider } from './contexts/categoryContext';
import CategoriesTable from './components/CategoriesTable';
import { Folder, Plus } from 'lucide-react';
import HierarchicalCategories from './components/HierarchicalCategories';

function CategoriesPage() {
  return (
    <CategoryProvider>
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <Folder className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Catégories</h1>
              <p className="text-gray-600 dark:text-gray-400">Gérez vos catégories</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter une catégorie
          </button>
        </div>

        {/* Tableau des produits */}
        <HierarchicalCategories />
      </div>
    </CategoryProvider>
  );
}

export default CategoriesPage;

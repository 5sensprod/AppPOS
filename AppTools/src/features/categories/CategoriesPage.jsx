// src/pages/CategoriesPage.jsx
import React, { useEffect } from 'react';
import { CategoryProvider, useCategory } from './contexts/categoryContext';
import CategoriesTable from './components/CategoriesTable';

// Composant interne qui utilise le hook useCategory
function CategoriesContent() {
  const { fetchCategorys, loading, error } = useCategory();

  useEffect(() => {
    // Charger les catégories au montage du composant
    fetchCategorys();
  }, [fetchCategorys]);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestion des catégories</h1>
      <CategoriesTable />
    </div>
  );
}

// Composant principal qui fournit le contexte
function CategoriesPage() {
  return (
    <CategoryProvider>
      <CategoriesContent />
    </CategoryProvider>
  );
}

export default CategoriesPage;

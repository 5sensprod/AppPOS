// src/pages/CategoriesPage.jsx
import React from 'react';
import CategoriesTable from '../components/CategoriesTable';

function CategoriesPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des catégories</h1>
        <p className="text-gray-600">
          Gérez vos catégories de produits et leur synchronisation avec WooCommerce
        </p>
      </div>

      <CategoriesTable />
    </div>
  );
}

export default CategoriesPage;

// src/features/products/components/ProductTable.jsx
import React, { useEffect, useState } from 'react';
import { createEntityTable } from '../../../factories/createEntityTable';
import { ENTITY_CONFIG } from '../constants';
import { useProduct } from '../contexts/productContext';

// Créer la table avec la factory
const ProductTableBase = createEntityTable(ENTITY_CONFIG);

// Composant qui connecte la table à son contexte
function ProductTable(props) {
  const { products, loading, error, fetchProducts, deleteProduct, syncProduct } = useProduct();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filtrage des produits par recherche et statut
  const filteredProducts = products
    ? products.filter((product) => {
        // Filtrage par terme de recherche
        const matchesSearch = searchTerm
          ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
          : true;

        // Filtrage par statut
        const matchesStatus = statusFilter === 'all' ? true : product.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par nom ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
      </div>

      {/* Table */}
      <ProductTableBase
        data={filteredProducts}
        isLoading={loading}
        error={error}
        onDelete={deleteProduct}
        onSync={syncProduct}
        {...props}
      />
    </div>
  );
}

export default ProductTable;

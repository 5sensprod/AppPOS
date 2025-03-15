// src/pages/BrandsPage.jsx
import React, { useEffect } from 'react';
import { BrandProvider, useBrand } from '../features/brands/contexts/brandContext';
import BrandsTable from '../components/BrandsTable';

// Composant interne qui utilise le hook useBrand
function BrandsContent() {
  const { fetchBrands, loading, error } = useBrand();

  useEffect(() => {
    // Charger les marques au montage du composant
    fetchBrands();
  }, [fetchBrands]);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des marques</h1>
        <p className="text-gray-600">
          Gérez vos marques de produits et leur synchronisation avec WooCommerce
        </p>
      </div>

      <BrandsTable />
    </div>
  );
}

// Composant principal qui fournit le contexte
function BrandsPage() {
  return (
    <BrandProvider>
      <BrandsContent />
    </BrandProvider>
  );
}

export default BrandsPage;

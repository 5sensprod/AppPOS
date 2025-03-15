// src/pages/BrandsPage.jsx
import React from 'react';
import BrandsTable from '../components/BrandsTable';

function BrandsPage() {
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

export default BrandsPage;

// src/features/products/ProductsPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductProvider } from './contexts/productContext';
import ProductTable from './components/ProductTable';
import { ENTITY_CONFIG } from './constants';
import { Package, Plus } from 'lucide-react';

console.log('Importé ProductProvider:', ProductProvider);
function ProductsPage() {
  const navigate = useNavigate();

  return (
    <ProductProvider>
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Produits</h1>
              <p className="text-gray-600 dark:text-gray-400">Gérez votre catalogue de produits</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/products/new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Ajouter un produit
          </button>
        </div>

        {/* Tableau des produits */}
        <ProductTable />
      </div>
    </ProductProvider>
  );
}

export default ProductsPage;

// src/features/labels/components/ProductSelector.jsx
import React, { useState } from 'react';
import { Search, X, Package } from 'lucide-react';

// Mockup de 3 produits
const MOCK_PRODUCTS = [
  {
    _id: 'QXYOVtdCdrNZf2xC',
    name: 'Zimmermann Studio S4/120',
    sku: 'HZ-S4NR',
    price: 6990,
    brand_ref: { name: 'ZIMMERMANN' },
    image: {
      url: 'https://axemusique.shop/wp-content/uploads/2025/09/photos-1743068250547-464492440-1.jpg',
    },
    stock: 1,
  },
  {
    _id: 'ABC123DEF456',
    name: 'Yamaha U1 Silent',
    sku: 'YMH-U1S',
    price: 8490,
    brand_ref: { name: 'YAMAHA' },
    image: { url: 'https://via.placeholder.com/150' },
    stock: 2,
  },
  {
    _id: 'XYZ789GHI012',
    name: 'Kawai K-200',
    sku: 'KWI-K200',
    price: 7590,
    brand_ref: { name: 'KAWAI' },
    image: { url: 'https://via.placeholder.com/150' },
    stock: 1,
  },
];

const ProductSelector = ({ onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Sélectionner un produit
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun produit trouvé</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product._id}
                  onClick={() => onSelect(product)}
                  className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={product.image?.url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center"><svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{product.sku}</span>
                        <span>•</span>
                        <span>{product.brand_ref.name}</span>
                      </div>
                    </div>

                    {/* Prix et stock */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {product.price.toLocaleString('fr-FR')}€
                      </div>
                      <div className="text-xs text-gray-500">Stock: {product.stock}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;

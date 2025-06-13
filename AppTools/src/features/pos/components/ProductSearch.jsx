// src/features/pos/components/ProductSearch.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCashierStore } from '../stores/cashierStore';

const ProductSearch = ({ onProductFound, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const { searchProduct, loading: isSearching } = useCashierStore();
  const searchType = 'auto'; // Toujours en auto-détection

  const performSearch = async (term, type) => {
    if (!term.trim() || term.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const product = await searchProduct(term.trim(), type);
      if (product) {
        if (
          type === 'barcode' ||
          (type === 'auto' && product.search_info?.found_by === 'barcode')
        ) {
          const barcode = product.meta_data?.find((m) => m.key === 'barcode')?.value;
          if (barcode && barcode === term.trim()) {
            selectProduct(product);
            return;
          }
        }

        setSuggestions([product]);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      setSuggestions([]);
    }
  };

  const selectProduct = (product) => {
    onProductFound(product);
    setSearchTerm('');
    setSuggestions([]);
    // Plus de setSearchResult - on n'affiche plus la confirmation
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value, searchType);
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      selectProduct(suggestions[0]);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setError(null);
    setSuggestions([]);
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!disabled) {
      searchInputRef.current?.focus();
    }
  }, [disabled]);

  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      if (!disabled && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key.match(/^[a-zA-Z0-9]$/)) {
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyPress);
    return () => window.removeEventListener('keydown', handleGlobalKeyPress);
  }, [disabled]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white flex items-center">
        <Scan className="h-5 w-5 mr-2" />
        Recherche produit
      </h3>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="SKU, code-barres ou scannez..."
          className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || isSearching}
          autoComplete="off"
        />

        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}

        {(searchTerm || error) && !isSearching && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 
                       text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mb-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
          {suggestions.map((product, index) => (
            <button
              key={product._id || index}
              onClick={() => selectProduct(product)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 
                         border-b border-gray-100 dark:border-gray-600 last:border-b-0 
                         focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-600"
            >
              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                SKU: {product.sku} • {product.price}€ • Stock: {product.stock}
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-200">Produit non trouvé</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>Vous pouvez commencer à taper depuis n'importe où sur la page</p>
        <p>Appuyez sur Entrée pour rechercher</p>
      </div>
    </div>
  );
};

export default ProductSearch;

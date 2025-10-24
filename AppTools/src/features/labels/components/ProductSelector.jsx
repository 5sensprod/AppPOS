// src/features/labels/components/ProductSelector.jsx
// Version connectée à ton store produits + recherche client productSearchProcessor
// - Utilise useProductDataStore() (cache + websocket)
// - Recherche locale via productSearchProcessor (cohérente avec ProductTable)
// - Multi-sélection conservée, pagination simple

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Search, X, Package, Check, Loader2 } from 'lucide-react';
import { useProductDataStore } from '@/features/products/stores/productStore';
import { productSearchProcessor } from '../../../utils/productSearchProcessor';

const PAGE_SIZE = 20; // même logique que dans ta table si besoin

const ProductSelector = ({ onSelect, onClose, multiSelect = false, selectedProducts = [] }) => {
  const {
    products, // liste mise en cache + live via WS
    loading,
    error,
    fetchProducts,
    initWebSocket,
    isCacheValid,
  } = useProductDataStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(Array.isArray(selectedProducts) ? selectedProducts : []);
  const [page, setPage] = useState(1);

  // --- Débounce du champ de recherche ---
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const debounceTimer = useRef(null);
  useEffect(() => {
    window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
      setPage(1); // reset pagination quand le terme change
    }, 250);
    return () => window.clearTimeout(debounceTimer.current);
  }, [searchTerm]);

  // --- Init data + websocket ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        initWebSocket?.(); // optionnel, no-op si déjà branché
        if (!isCacheValid?.() || (products?.length ?? 0) === 0) {
          await fetchProducts();
        }
      } catch (e) {
        // laisser l'UI afficher error si store l'expose
        console.error('[ProductSelector] init error', e);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Recherche locale avec le même processor que ProductTable ---
  const searchFields = useMemo(() => ['name', 'sku', 'designation'], []);
  const filtered = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return productSearchProcessor(list, debouncedTerm, searchFields);
  }, [products, debouncedTerm, searchFields]);

  // --- Pagination client ---
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // --- Sélection ---
  const isSelected = useCallback(
    (productId) => selected.some((p) => p._id === productId),
    [selected]
  );

  const toggleSelect = useCallback(
    (product) => {
      if (!multiSelect) {
        onSelect?.(product);
        return;
      }
      setSelected((prev) =>
        isSelected(product._id) ? prev.filter((p) => p._id !== product._id) : [...prev, product]
      );
    },
    [multiSelect, onSelect, isSelected]
  );

  const handleValidate = useCallback(() => {
    if (multiSelect) onSelect?.(selected);
  }, [multiSelect, onSelect, selected]);

  // --- Accessibilité clavier ---
  const onKeyDown = (e) => {
    if (e.key === 'Escape') onClose?.();
    if (!multiSelect && e.key === 'Enter' && pagedItems.length === 1) onSelect?.(pagedItems[0]);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={onKeyDown}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Sélectionner {multiSelect ? 'des produits' : 'un produit'}
            </h2>
            {multiSelect && selected.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selected.length} produit{selected.length > 1 ? 's' : ''} sélectionné
                {selected.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, SKU, marque, catégorie, code-barres..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />
            )}
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">{String(error)}</div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {!loading && filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucun produit trouvé</p>
              </div>
            ) : (
              pagedItems.map((product) => {
                const checked = isSelected(product._id);
                const brandName =
                  product.brand_ref?.name || product.brand?.name || product.brand_name || '';
                const imageUrl = product.image?.url || product.image_url || null;
                return (
                  <button
                    key={product._id}
                    onClick={() => toggleSelect(product)}
                    className={`w-full p-4 border rounded-lg transition-all text-left relative ${
                      checked
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {multiSelect && (
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                        >
                          {checked && <Check className="h-3 w-3 text-white" />}
                        </div>
                      )}

                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {product.name || product.designation || product.sku}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          {product.sku && <span>{product.sku}</span>}
                          {product.sku && brandName && <span>•</span>}
                          {brandName && <span>{brandName}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        {product.price != null && (
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {Number(product.price).toLocaleString('fr-FR')}€
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          Stock: {product.stock ?? product.qty ?? 0}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <span>
              {page} / {pageCount}
            </span>
            <button
              className="px-2 py-1 border rounded disabled:opacity-50"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              Suivant
            </button>
          </div>
        </div>

        {/* Footer validation multi-sélection */}
        {multiSelect && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleValidate}
              disabled={selected.length === 0}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider ({selected.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductSelector;

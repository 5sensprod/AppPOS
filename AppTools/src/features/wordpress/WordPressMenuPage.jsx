import React, { useState, useEffect } from 'react';
import {
  Menu,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Home,
  Loader2,
  AlertCircle,
  RefreshCw,
  Package,
} from 'lucide-react';
import { useWordPressMenu } from '../../hooks/useWordPressMenu';

const WordPressMenuPage = () => {
  const {
    menuData,
    loading,
    error,
    loadMainMenu,
    menuItems,
    menuInfo,
    stats,
    isConfigured,
    isWooConfigured,
  } = useWordPressMenu();

  const [expandedItems, setExpandedItems] = useState(new Set());
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  // Charger le menu au montage
  useEffect(() => {
    if (isConfigured) {
      loadMainMenu();
    }
  }, [loadMainMenu, isConfigured]);

  // Fonction pour charger tous les produits WooCommerce
  const loadAllProducts = async () => {
    if (!isWooConfigured || loadingProducts) return;

    setLoadingProducts(true);
    try {
      const config = {
        url: import.meta.env.VITE_WC_URL,
        consumerKey: import.meta.env.VITE_WC_CONSUMER_KEY,
        consumerSecret: import.meta.env.VITE_WC_CONSUMER_SECRET,
      };

      const url = new URL(`${config.url}/wp-json/wc/v3/products`);
      url.searchParams.append('consumer_key', config.consumerKey);
      url.searchParams.append('consumer_secret', config.consumerSecret);
      url.searchParams.append('per_page', '20');
      url.searchParams.append('status', 'publish');

      console.log('🛍️ Chargement des produits...');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Erreur API WooCommerce: ${response.status}`);
      }

      const products = await response.json();
      console.log(`✅ ${products.length} produits chargés`);

      setAllProducts(products);
      setShowProducts(true);
    } catch (error) {
      console.error('❌ Erreur chargement produits:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleItemExpansion = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const renderMenuItem = (item, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const paddingLeft = level * 20;

    return (
      <div key={item.id} className="mb-1">
        <div
          className={`
            flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
            hover:bg-blue-50 dark:hover:bg-gray-700 group
            ${level > 0 ? 'ml-4 border-l-2 border-gray-200 dark:border-gray-600' : ''}
          `}
          style={{ paddingLeft: `${16 + paddingLeft}px` }}
          onClick={() => hasChildren && toggleItemExpansion(item.id)}
        >
          {/* Icône d'expansion */}
          {hasChildren && (
            <button className="mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600 dark:text-gray-300" />
              ) : (
                <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
              )}
            </button>
          )}

          {/* Icône de l'élément */}
          <div className="mr-3">
            {item.type === 'custom' ? (
              <ExternalLink size={18} className="text-blue-500" />
            ) : (
              <Home size={18} className="text-green-500" />
            )}
          </div>

          {/* Contenu de l'élément */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className="font-medium text-gray-900 dark:text-white"
                  dangerouslySetInnerHTML={{ __html: item.title }}
                />
                {item.url && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.url}</p>
                )}
              </div>

              {/* Badge du type */}
              <span
                className={`
                px-2 py-1 text-xs rounded-full font-medium
                ${
                  item.type === 'custom'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }
              `}
              >
                {item.type || 'page'}
              </span>
            </div>

            {/* Métadonnées */}
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              ID: {item.id} | Ordre: {item.menu_order || 0}
              {item.target && ` | Target: ${item.target}`}
            </div>
          </div>
        </div>

        {/* Éléments enfants */}
        {hasChildren && isExpanded && (
          <div className="mt-2">
            {item.children.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Configuration manquante
  if (!isConfigured) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Configuration WordPress manquante
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Veuillez configurer les variables d'environnement dans votre fichier .env
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chargement
  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-3" size={24} />
          <span className="text-gray-600 dark:text-gray-300">Chargement du menu WordPress...</span>
        </div>
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <button
              onClick={loadMainMenu}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} className="mr-2" />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Menu className="mr-3 text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Menu WordPress</h1>
            {menuInfo && (
              <p className="text-gray-600 dark:text-gray-300">
                {menuInfo.name} - {stats.totalItems} élément(s)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMainMenu}
            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Actualiser
          </button>

          {isWooConfigured && (
            <button
              onClick={loadAllProducts}
              disabled={loadingProducts}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loadingProducts ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Package size={16} className="mr-2" />
              )}
              {loadingProducts ? 'Chargement...' : 'Charger Produits'}
            </button>
          )}
        </div>
      </div>

      {/* Statut configuration */}
      <div className="mb-6 flex gap-4">
        <div
          className={`
          flex items-center px-3 py-2 rounded-lg text-sm font-medium
          ${
            isConfigured
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }
        `}
        >
          WordPress: {isConfigured ? '✅ OK' : '❌ Erreur'}
        </div>
        <div
          className={`
          flex items-center px-3 py-2 rounded-lg text-sm font-medium
          ${
            isWooConfigured
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }
        `}
        >
          WooCommerce: {isWooConfigured ? '✅ OK' : '⚠️ Non configuré'}
        </div>
      </div>

      {/* Menu WordPress */}
      <div className="space-y-2">
        {menuItems.length > 0 ? (
          menuItems.map((item) => renderMenuItem(item))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun élément de menu trouvé
          </div>
        )}
      </div>

      {/* Produits WooCommerce */}
      {showProducts && allProducts.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200">
              🛍️ Produits WooCommerce ({allProducts.length})
            </h2>
            <button
              onClick={() => setShowProducts(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              Masquer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProducts.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span
                    className="text-green-600 font-medium"
                    dangerouslySetInnerHTML={{ __html: product.price_html || `${product.price}€` }}
                  />
                  <span
                    className={`
                    px-2 py-1 text-xs rounded
                    ${
                      product.stock_status === 'instock'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }
                  `}
                  >
                    {product.stock_status === 'instock' ? 'En stock' : 'Rupture'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WordPressMenuPage;

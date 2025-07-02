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
} from 'lucide-react';
import { useWordPressMenu } from '../hooks/useWordPressMenu'; // ✅ Chemin corrigé

const WordPressMenuPage = () => {
  const {
    menuData,
    loading,
    error,
    loadMainMenu,
    menuItems,
    menuInfo,
    stats,
    isConfigured, // ✅ Nouvelle propriété pour vérifier la config
  } = useWordPressMenu();

  const [expandedItems, setExpandedItems] = useState(new Set());

  // Charger le menu au montage du composant
  useEffect(() => {
    if (isConfigured) {
      loadMainMenu();
    }
  }, [loadMainMenu, isConfigured]);

  // Afficher un message si la configuration est manquante
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
              Veuillez configurer les variables d'environnement WordPress dans votre fichier .env
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-400 text-left bg-gray-100 dark:bg-gray-700 p-4 rounded">
              <p className="font-medium mb-2">Variables requises :</p>
              <ul className="space-y-1">
                <li>• VITE_WC_URL</li>
                <li>• VITE_WP_USER</li>
                <li>• VITE_WP_APP_PASSWORD</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
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
                {item.type}
              </span>
            </div>

            {/* Métadonnées */}
            <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              ID: {item.id} | Ordre: {item.menu_order}
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
            {menuData?.menu && (
              <p className="text-gray-600 dark:text-gray-300">
                {menuInfo.name} - {stats.totalItems} élément(s)
              </p>
            )}
          </div>
        </div>

        <button
          onClick={loadMainMenu}
          className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw size={16} className="mr-2" />
          Actualiser
        </button>
      </div>

      {/* Informations du menu */}
      {menuInfo && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Informations du menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Nom:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{menuInfo.name}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">Slug:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{menuInfo.slug}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600 dark:text-gray-400">ID:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{menuInfo.id}</span>
            </div>
          </div>

          {/* ✅ Statistiques du menu */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Statistiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Total éléments:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">{stats.totalItems}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Éléments racine:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">{stats.rootItems}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Profondeur max:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">{stats.maxDepth}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des éléments du menu */}
      <div className="space-y-2">
        {menuItems.length > 0 ? (
          menuItems.map((item) => renderMenuItem(item))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun élément de menu trouvé
          </div>
        )}
      </div>

      {/* Actions en bas */}
      <div className="mt-6 flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total: {stats.totalItems} élément(s) de menu
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setExpandedItems(new Set())}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Réduire tout
          </button>
          <button
            onClick={() => {
              const allIds = new Set();
              const collectIds = (items) => {
                items.forEach((item) => {
                  if (item.children && item.children.length > 0) {
                    allIds.add(item.id);
                    collectIds(item.children);
                  }
                });
              };
              collectIds(menuItems);
              setExpandedItems(allIds);
            }}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            Développer tout
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordPressMenuPage;

// src/components/common/EntityDetail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Trash, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Composant générique pour afficher les détails d'une entité
 */
const EntityDetail = ({
  // Données
  entity,
  entityId,
  // Métadonnées
  entityName = '',
  entityNamePlural = '',
  baseRoute = '',
  // Configuration d'affichage
  tabs = [],
  renderTabContent,
  actions = ['edit', 'delete'],
  // Fonctionnalités optionnelles
  syncEnabled = false,
  // Handlers
  onDelete,
  onSync,
  // État
  isLoading = false,
  error = null,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : 'general');

  // Gérer la suppression de l'entité
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer ${entityName ? `ce ${entityName}` : 'cet élément'} ?`
      )
    )
      return;

    try {
      await onDelete(entityId);
      navigate(baseRoute);
    } catch (error) {
      console.error(
        `Erreur lors de la suppression ${entityName ? `du ${entityName}` : "de l'élément"}:`,
        error
      );
    }
  };

  // Gérer la synchronisation de l'entité
  const handleSync = async () => {
    try {
      await onSync(entityId);
    } catch (error) {
      console.error(
        `Erreur lors de la synchronisation ${entityName ? `du ${entityName}` : "de l'élément"}:`,
        error
      );
    }
  };

  // Affichage pendant le chargement
  if (isLoading && !entity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Chargement {entityName ? `du ${entityName}` : 'des données'}...
          </p>
        </div>
      </div>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
        <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
          Une erreur est survenue
        </h2>
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={() => navigate(baseRoute)}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retour à la liste {entityNamePlural ? `des ${entityNamePlural}` : ''}
        </button>
      </div>
    );
  }

  // Si l'entité n'existe pas
  if (!entity) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-lg">
        <h2 className="text-yellow-800 dark:text-yellow-200 text-lg font-medium mb-2">
          {entityName ? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)}` : 'Élément'}{' '}
          non trouvé
        </h2>
        <p className="text-yellow-700 dark:text-yellow-300">
          {entityName
            ? `Le ${entityName} que vous recherchez n'existe pas ou a été supprimé.`
            : `L'élément que vous recherchez n'existe pas ou a été supprimé.`}
        </p>
        <button
          onClick={() => navigate(baseRoute)}
          className="mt-4 px-4 py-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-700"
        >
          Retour à la liste {entityNamePlural ? `des ${entityNamePlural}` : ''}
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(baseRoute)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {entity.name ||
              `${entityName ? entityName.charAt(0).toUpperCase() + entityName.slice(1) : 'Détails'}`}
          </h1>
        </div>

        <div className="flex space-x-3">
          {actions.includes('edit') && (
            <button
              onClick={() => navigate(`${baseRoute}/${entityId}/edit`)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </button>
          )}

          {syncEnabled && (
            <button
              onClick={handleSync}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                entity.woo_id
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {entity.woo_id ? 'Resynchroniser' : 'Synchroniser'}
            </button>
          )}

          {actions.includes('delete') && (
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              <Trash className="h-4 w-4 mr-2" />
              Supprimer
            </button>
          )}
        </div>
      </div>

      {/* Contenu avec onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        {tabs.length > 1 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Contenu des onglets */}
        <div className="p-6">{renderTabContent && renderTabContent(entity, activeTab)}</div>
      </div>
    </div>
  );
};

export default EntityDetail;

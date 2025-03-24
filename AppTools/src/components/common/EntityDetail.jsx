// src/components/common/EntityDetail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, Edit, Trash } from 'lucide-react';
import { TabNavigation, ActionButton, InfoCard } from '../ui';

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
  // Préférences d'interface utilisateur
  activeTab: externalActiveTab = null,
  onTabChange: externalTabChange = null,
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

  // État local pour l'onglet actif (utilisé uniquement si externalActiveTab n'est pas fourni)
  const [localActiveTab, setLocalActiveTab] = useState(tabs.length > 0 ? tabs[0].id : 'general');

  // Déterminer si nous utilisons l'état local ou externe pour l'onglet actif
  const activeTab = externalActiveTab !== null ? externalActiveTab : localActiveTab;

  // Fonction qui gère le changement d'onglet, en fonction de la disponibilité du handler externe
  const handleTabChange = (tabId) => {
    if (externalTabChange) {
      externalTabChange(tabId);
    } else {
      setLocalActiveTab(tabId);
    }
  };

  // S'assurer que l'onglet actif est valide par rapport aux onglets disponibles
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.id === activeTab)) {
      handleTabChange(tabs[0].id);
    }
  }, [tabs, activeTab]);

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
      <InfoCard variant="danger" title="Une erreur est survenue" icon={AlertCircle}>
        <p>{error}</p>
        <button
          onClick={() => navigate(baseRoute)}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
        >
          Retour à la liste {entityNamePlural ? `des ${entityNamePlural}` : ''}
        </button>
      </InfoCard>
    );
  }

  // Si l'entité n'existe pas
  if (!entity) {
    return (
      <InfoCard
        variant="warning"
        title={`${entityName ? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)}` : 'Élément'} non trouvé`}
        icon={AlertCircle}
      >
        <p>
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
      </InfoCard>
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
            <ActionButton
              onClick={() => navigate(`${baseRoute}/${entityId}/edit`)}
              icon={Edit}
              label="Modifier"
              variant="primary"
            />
          )}

          {syncEnabled && (
            <ActionButton
              onClick={handleSync}
              icon={RefreshCw}
              label={entity.woo_id ? 'Resynchroniser' : 'Synchroniser'}
              variant={entity.woo_id ? 'success' : 'primary'}
              isLoading={isLoading}
            />
          )}

          {actions.includes('delete') && (
            <ActionButton onClick={handleDelete} icon={Trash} label="Supprimer" variant="danger" />
          )}
        </div>
      </div>

      {/* Contenu avec onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        {tabs.length > 1 && (
          <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {/* Contenu des onglets */}
        <div className="p-6">{renderTabContent && renderTabContent(entity, activeTab)}</div>
      </div>
    </div>
  );
};

export default EntityDetail;

// src/components/common/EntityDetail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ArrowLeft, RefreshCw, AlertCircle, Edit, Trash, Save, X } from 'lucide-react';
import { TabNavigation, ActionButton, InfoCard } from '../ui';

/**
 * Composant générique bidirectionnel pour afficher ou éditer les détails d'une entité
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
  // Mode d'édition
  editable = false,
  validationSchema = null,
  defaultValues = {},
  // Fonctionnalités optionnelles
  syncEnabled = false,
  // Handlers
  onDelete,
  onSync,
  onSubmit,
  onCancel,
  // État
  isLoading = false,
  error = null,
  success = null,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs.length > 0 ? tabs[0].id : 'general');
  const [serverError, setServerError] = useState(error);
  const [successMessage, setSuccessMessage] = useState(success);

  // Configuration du formulaire si en mode édition
  const formMethods = useForm({
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    defaultValues: editable ? { ...defaultValues, ...entity } : {},
    mode: 'onChange',
  });

  // Mettre à jour le formulaire si l'entité change
  useEffect(() => {
    if (editable && entity) {
      formMethods.reset({ ...defaultValues, ...entity });
    }
  }, [entity, editable, defaultValues, formMethods]);

  // Mettre à jour les erreurs et succès
  useEffect(() => {
    setServerError(error);
  }, [error]);

  useEffect(() => {
    setSuccessMessage(success);
  }, [success]);

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
      setServerError(`Erreur lors de la suppression: ${error.message}`);
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
      setServerError(`Erreur lors de la synchronisation: ${error.message}`);
    }
  };

  // Gérer l'annulation du formulaire
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(baseRoute);
    }
  };

  // Gérer la soumission du formulaire
  const handleFormSubmit = async (data) => {
    setServerError(null);
    try {
      await onSubmit(data, entityId);
      setSuccessMessage(`${entityName || "L'élément"} a été mis à jour avec succès.`);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour:`, error);
      setServerError(`Erreur lors de la mise à jour: ${error.message}`);
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
  if (serverError) {
    return (
      <InfoCard variant="danger" title="Une erreur est survenue" icon={AlertCircle}>
        <p>{serverError}</p>
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
  if (!entity && !editable) {
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

  // Message de succès
  const successNotification = successMessage && (
    <div className="mb-6">
      <InfoCard variant="success" title="Opération réussie">
        <p>{successMessage}</p>
      </InfoCard>
    </div>
  );

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
            {editable
              ? `${entity ? 'Modifier' : 'Créer'} ${entityName || 'élément'}`
              : entity?.name ||
                `${entityName ? entityName.charAt(0).toUpperCase() + entityName.slice(1) : 'Détails'}`}
          </h1>
        </div>

        <div className="flex space-x-3">
          {!editable ? (
            // Actions en mode lecture
            <>
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
                <ActionButton
                  onClick={handleDelete}
                  icon={Trash}
                  label="Supprimer"
                  variant="danger"
                />
              )}
            </>
          ) : (
            // Actions en mode édition
            <>
              <ActionButton onClick={handleCancel} icon={X} label="Annuler" variant="secondary" />
              <ActionButton
                onClick={formMethods.handleSubmit(handleFormSubmit)}
                icon={Save}
                label="Enregistrer"
                variant="primary"
                isLoading={isLoading}
              />
            </>
          )}
        </div>
      </div>

      {/* Message de succès */}
      {successNotification}

      {/* Contenu avec onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        {tabs.length > 1 && (
          <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {/* Contenu des onglets */}
        {editable ? (
          // En mode édition, on encapsule dans FormProvider
          <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(handleFormSubmit)}>
              <div className="p-6">
                {renderTabContent &&
                  renderTabContent(entity, activeTab, {
                    editable,
                    control: formMethods.control,
                    register: formMethods.register,
                    errors: formMethods.formState.errors,
                    watch: formMethods.watch,
                  })}
              </div>

              {/* Boutons d'action en bas du formulaire */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </FormProvider>
        ) : (
          // En mode lecture, pas besoin de FormProvider
          <div className="p-6">
            {renderTabContent && renderTabContent(entity, activeTab, { editable: false })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityDetail;

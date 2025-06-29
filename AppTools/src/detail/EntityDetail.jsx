// src/components/detail/EntityDetail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ArrowLeft, RefreshCw, AlertCircle, Edit, Trash, Save, X } from 'lucide-react';
import TabRenderer from './TabRenderer';
import TabNavigation from '../components/organisms/TabNavigation';
import InfoCard from '../components/molecules/InfoCard';
/**
 * Composant générique bidirectionnel pour afficher ou éditer les détails d'une entité
 * Version enrichie qui combine l'ancien système avec la nouvelle approche atomique
 */
const EntityDetail = ({
  // Données
  entity,
  entityId,

  // Configuration (nouveau système)
  config,

  // Métadonnées (ancien système - pour compatibilité)
  entityName = config?.entityName || '',
  entityNamePlural = config?.entityNamePlural || '',
  baseRoute = config?.baseRoute || '',

  // Configuration d'affichage
  tabs = config?.tabs || [],
  renderTabContent, // Fonction de rendu personnalisé (ancien système)
  actions = config?.actions
    ? Object.keys(config.actions).filter((k) => config.actions[k])
    : ['edit', 'delete'],

  // Mode d'édition
  editable = false,
  validationSchema = null,
  defaultValues = config?.defaultValues || {},

  // Fonctionnalités optionnelles
  syncEnabled = config?.actions?.sync || false,

  // Handlers
  onDelete,
  title,
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
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Configuration du formulaire si en mode édition
  const formMethods = useForm({
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
    defaultValues: editable ? { ...defaultValues, ...entity } : {},
    mode: 'onChange',
  });

  // État pour suivre si le formulaire a été modifié
  const [formDirty, setFormDirty] = useState(false);

  // Surveiller les changements dans le formulaire
  useEffect(() => {
    if (editable) {
      const subscription = formMethods.watch((value, { name, type }) => {
        setFormDirty(true);
      });
      return () => subscription.unsubscribe();
    }
  }, [editable, formMethods]);

  // Mettre à jour le formulaire si l'entité change
  useEffect(() => {
    if (editable && entity) {
      formMethods.reset({ ...defaultValues, ...entity });
      setFormDirty(false);
    }
  }, [entity, editable, defaultValues, formMethods]);

  // Mettre à jour les erreurs et succès
  useEffect(() => {
    setServerError(error);
  }, [error]);

  useEffect(() => {
    setSuccessMessage(success);
  }, [success]);

  // Modal de confirmation simple (remplace useConfirmModal)
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const confirm = (action) => {
    return new Promise((resolve) => {
      setConfirmAction(() => () => {
        resolve(true);
        setShowConfirm(false);
      });
      setShowConfirm(true);
    });
  };

  // Gérer la suppression de l'entité
  const handleDelete = async () => {
    try {
      const confirmed = await confirm();
      if (!confirmed) return;

      console.log('🗑️ Début de suppression');
      await onDelete(entityId);
      navigate(baseRoute);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setServerError(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Gérer la synchronisation de l'entité
  const handleSync = async () => {
    try {
      await onSync(entityId);
    } catch (error) {
      console.error(`Erreur lors de la synchronisation:`, error);
      setServerError(`Erreur lors de la synchronisation: ${error.message}`);
    }
  };

  // Gérer l'annulation du formulaire
  const handleCancel = () => {
    if (entity) {
      formMethods.reset({ ...defaultValues, ...entity });
    }

    setFormSubmitted(false);
    setFormDirty(false);

    if (onCancel) {
      onCancel(false);
    } else if (formSubmitted) {
      // Si le formulaire a été soumis, rester en mode édition
    } else {
      navigate(baseRoute);
    }
  };

  // Gérer la soumission du formulaire
  const handleFormSubmit = async (data) => {
    setServerError(null);
    setFormSubmitted(true);

    try {
      await onSubmit(data, entityId);
      setSuccessMessage(`${entityName || "L'élément"} a été mis à jour avec succès.`);
      setFormDirty(false);
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
        title={`${
          entityName ? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)}` : 'Élément'
        } non trouvé`}
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

  // Déterminer le titre à afficher
  const getEntityTitle = () => {
    if (entity) {
      if (entity.sku) return entity.sku;
      if (entity.designation) return entity.designation;
      if (entity.name) return entity.name;
    }
    return entityName ? entityName.charAt(0).toUpperCase() + entityName.slice(1) : 'Détails';
  };

  const dynamicTitle =
    title ||
    (editable
      ? `${entity ? `Modifier « ${getEntityTitle()} »` : `Ajouter ${entityName}`}`
      : getEntityTitle());

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dynamicTitle}</h1>
        </div>

        <div className="flex space-x-3">
          {!editable ? (
            // Actions en mode lecture
            <>
              {actions.includes('edit') && (
                <button
                  onClick={() => navigate(`${baseRoute}/${entityId}/edit`)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </button>
              )}

              {syncEnabled && (
                <button
                  onClick={handleSync}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
                    entity.woo_id
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {entity.woo_id ? 'Resynchroniser' : 'Synchroniser'}
                </button>
              )}

              {actions.includes('delete') && (
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Supprimer
                </button>
              )}
            </>
          ) : (
            // Actions en mode édition
            <>
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </button>

              <button
                onClick={formMethods.handleSubmit(handleFormSubmit)}
                disabled={!formDirty || isLoading}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  !formDirty || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </button>
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
                {renderTabContent ? (
                  // Ancien système : fonction de rendu personnalisé
                  renderTabContent(entity, activeTab, {
                    editable,
                    control: formMethods.control,
                    register: formMethods.register,
                    errors: formMethods.formState.errors,
                    setValue: formMethods.setValue,
                    watch: formMethods.watch,
                    getValues: formMethods.getValues,
                    formState: formMethods.formState,
                  })
                ) : (
                  // Nouveau système : rendu automatique via config
                  <TabRenderer
                    tabConfig={tabs.find((tab) => tab.id === activeTab)}
                    editable={editable}
                    entity={entity}
                  />
                )}
              </div>
            </form>
          </FormProvider>
        ) : (
          // En mode lecture, pas besoin de FormProvider
          <div className="p-6">
            {renderTabContent ? (
              // Ancien système
              renderTabContent(entity, activeTab, { editable: false })
            ) : (
              // Nouveau système
              <TabRenderer
                tabConfig={tabs.find((tab) => tab.id === activeTab)}
                editable={false}
                entity={entity}
              />
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmation simple */}
      {showConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirmer la suppression
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Êtes-vous sûr de vouloir supprimer{' '}
                  {entityName ? `ce ${entityName}` : 'cet élément'} ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityDetail;

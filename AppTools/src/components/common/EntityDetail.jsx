// src/components/common/EntityDetail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ArrowLeft, RefreshCw, AlertCircle, Edit, Trash, Save, X } from 'lucide-react';
import { TabNavigation, ActionButton, InfoCard } from '../ui';
import { useConfirmModal } from '../hooks/useConfirmModal';

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
  onUploadImage,
  onDeleteImage,
  onSetMainImage,
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
  const { confirm, ConfirmModal } = useConfirmModal();

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
  const markFormAsDirty = () => {
    if (editable) {
      setFormDirty(true);
      console.log('📝 Formulaire marqué comme modifié suite à upload/suppression image');
    }
  };

  // ✅ WRAPPERS pour déclencher formDirty après actions d'images
  const handleImageUpload = async (entityId, file) => {
    try {
      if (onUploadImage) {
        const result = await onUploadImage(entityId, file);
        markFormAsDirty(); // ✅ Marquer le formulaire comme modifié
        return result;
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw error;
    }
  };

  const handleImageDelete = async (entityId) => {
    try {
      if (onDeleteImage) {
        const result = await onDeleteImage(entityId);
        markFormAsDirty(); // ✅ Marquer le formulaire comme modifié
        return result;
      }
    } catch (error) {
      console.error('Erreur suppression image:', error);
      throw error;
    }
  };

  const handleSetMainImage = async (entityId, imageId, imageIndex) => {
    try {
      if (onSetMainImage) {
        const result = await onSetMainImage(entityId, imageId, imageIndex);
        markFormAsDirty(); // ✅ Marquer le formulaire comme modifié
        return result;
      }
    } catch (error) {
      console.error('Erreur définition image principale:', error);
      throw error;
    }
  };

  // Surveiller les changements dans le formulaire
  useEffect(() => {
    if (editable) {
      const subscription = formMethods.watch((value, { name, type }) => {
        // Toute modification rend le formulaire dirty
        setFormDirty(true);
      });
      return () => subscription.unsubscribe();
    }
  }, [editable, formMethods]);

  // Log pour vérifier les méthodes du formulaire
  useEffect(() => {
    if (editable) {
      console.log('formMethods disponibles:', {
        setValue: !!formMethods.setValue,
        watch: !!formMethods.watch,
        getValues: !!formMethods.getValues,
        isDirty: formMethods.formState.isDirty,
      });
    }
  }, [editable, formMethods]);

  // Mettre à jour le formulaire si l'entité change
  useEffect(() => {
    if (editable && entity) {
      const currentFormDirty = formDirty; // ✅ Sauvegarder l'état actuel

      formMethods.reset({ ...defaultValues, ...entity });

      // ✅ Restaurer formDirty si il était à true (évite le reset après upload)
      if (currentFormDirty) {
        setFormDirty(true);
        console.log('🔄 Entité mise à jour via WebSocket, formDirty préservé');
      } else {
        setFormDirty(false);
      }
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
    try {
      const entityDisplayName = entity?.name || entity?.designation || entityName;

      const confirmed = await confirm({
        title: 'Confirmer la suppression',
        message: `Êtes-vous sûr de vouloir supprimer la ${entityName} "${entityDisplayName}" ? Cette action est irréversible.`,
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        variant: 'danger',
      });

      if (!confirmed) return;

      console.log('🗑️ Début de suppression');

      const result = await onDelete(entityId);

      if (result?.dependency) {
        console.log('⚠️ Suppression bloquée par dépendance - rester sur la page');
        return;
      }

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
      console.error(
        `Erreur lors de la synchronisation ${entityName ? `du ${entityName}` : "de l'élément"}:`,
        error
      );
      setServerError(`Erreur lors de la synchronisation: ${error.message}`);
    }
  };

  // Gérer l'annulation du formulaire
  const handleCancel = () => {
    // Réinitialiser le formulaire aux valeurs initiales de l'entité
    if (entity) {
      formMethods.reset({ ...defaultValues, ...entity });
    }

    // Réinitialiser l'état de soumission et les modifications
    setFormSubmitted(false);
    setFormDirty(false);

    if (onCancel) {
      // Appeler le callback personnalisé mais rester en mode édition
      onCancel(false); // Passer false pour indiquer de rester en mode édition
    } else if (formSubmitted) {
      // Si le formulaire a été soumis, rester en mode édition
      // Ne pas naviguer ailleurs
    } else {
      // Si aucune soumission n'a été faite, revenir à la liste
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

  // Déterminer le titre à afficher avec priorité SKU > désignation > name
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
                disabled={!formDirty}
                className={!formDirty ? 'opacity-50 cursor-not-allowed' : ''}
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
          <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(handleFormSubmit)}>
              <div className="p-6">
                {renderTabContent &&
                  renderTabContent(entity, activeTab, {
                    editable,
                    control: formMethods.control,
                    register: formMethods.register,
                    errors: formMethods.formState.errors,
                    setValue: formMethods.setValue,
                    watch: formMethods.watch,
                    getValues: formMethods.getValues,
                    formState: formMethods.formState,
                    onUploadImage: handleImageUpload,
                    onDeleteImage: handleImageDelete,
                    onSetMainImage: handleSetMainImage, // ✅ AJOUTER
                  })}
              </div>
            </form>
          </FormProvider>
        ) : (
          <div className="p-6">
            {renderTabContent &&
              renderTabContent(entity, activeTab, {
                editable: false,
                onUploadImage,
                onDeleteImage,
                onSetMainImage, // ✅ AJOUTER
              })}
          </div>
        )}
        <ConfirmModal />
      </div>
    </div>
  );
};

export default EntityDetail;

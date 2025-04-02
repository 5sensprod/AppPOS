// src/features/categories/components/CategorieDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import { ENTITY_CONFIG } from '../constants';
import HierarchicalParentSelector from '../../../components/common/HierarchicalParentSelector';
import { Controller } from 'react-hook-form';

import {
  getValidationSchema,
  defaultValues,
  transformToOptions,
  formatCategoryData,
  extractCategoryId,
} from '../services/categoryService';

function CategorieDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Important: Vérifier d'abord si on est en mode création
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [parentCategories, setParentCategories] = useState([]);

  // Hooks Zustand
  const { getCategoryById, createCategory, updateCategory, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  // Hiérarchie des catégories
  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  // État pour le WebSocket
  const [wsInitialized, setWsInitialized] = useState(false);

  // Initialiser les WebSockets une seule fois
  useEffect(() => {
    if (!wsInitialized) {
      console.log('[CATEGORY_DETAIL] Initialisation WebSocket');
      const cleanup = initWebSocketListeners();
      setWsInitialized(true);

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [initWebSocketListeners, wsInitialized]);

  // Charger les catégories hiérarchiques et la catégorie courante
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        // Charger les catégories hiérarchiques
        await fetchHierarchicalCategories();

        // Si on est en mode nouveau, initialiser avec les valeurs par défaut
        if (isNew) {
          setCategory(defaultValues);
          setLoading(false);
          return;
        }

        // Récupérer l'ID effectif
        const effectiveId = currentId || paramId;
        if (!effectiveId) {
          setLoading(false);
          return;
        }

        // Charger la catégorie
        const categoryData = await getCategoryById(effectiveId);
        setCategory(categoryData);
        setError(null);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError(`Erreur lors du chargement: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentId, paramId, isNew, fetchHierarchicalCategories, getCategoryById]);

  // Mettre à jour les options de catégories parentes
  useEffect(() => {
    if (
      hierarchicalCategories &&
      Array.isArray(hierarchicalCategories) &&
      hierarchicalCategories.length > 0
    ) {
      const effectiveId = currentId || paramId;
      // Utiliser isNew pour transformer correctement les options
      const options = transformToOptions(hierarchicalCategories, effectiveId, isNew);
      setParentCategories(options);
    }
  }, [hierarchicalCategories, currentId, paramId, isNew]);

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // 🧹 Nettoyer les données avant envoi
      const formattedData = formatCategoryData(data);

      if (isNew) {
        console.log('Données formatées pour création:', formattedData);
        const created = await createCategory(formattedData);

        // 🆔 Extraire proprement l'ID
        const newId = extractCategoryId(created);

        if (!newId) {
          console.error('Réponse API complète:', created);
          throw new Error(
            "L'identifiant de la catégorie créée est introuvable dans la réponse API."
          );
        }

        setCurrentId(newId);
        setSuccess('Catégorie créée avec succès');

        const newCategory = await getCategoryById(newId);
        setCategory(newCategory);

        // Rediriger vers la page de détail
        navigate(`/products/categories/${newId}`, { replace: true });
      } else {
        const effectiveId = currentId || paramId;
        console.log(`Mise à jour de la catégorie ${effectiveId}:`, formattedData);

        await updateCategory(effectiveId, formattedData);
        setSuccess('Catégorie mise à jour avec succès');

        const updated = await getCategoryById(effectiveId);
        setCategory(updated);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour supprimer une catégorie
  const handleDelete = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await deleteCategory(effectiveId);
      navigate('/products/categories');
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    if (isNew) {
      navigate('/products/categories');
    } else {
      const effectiveId = currentId || paramId;
      navigate(`/products/categories/${effectiveId}`);
    }
  };

  // Gestionnaire pour synchroniser une catégorie avec WooCommerce
  const handleSync = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await syncCategory(effectiveId);
      const updated = await getCategoryById(effectiveId);
      setCategory(updated);
      setSuccess('Catégorie synchronisée avec succès');
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError('Erreur lors de la synchronisation de la catégorie');
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour l'upload d'image
  const handleUploadImage = async (entityId, imageFile) => {
    try {
      await uploadImage(entityId, imageFile);
      const effectiveId = currentId || paramId;
      const updated = await getCategoryById(effectiveId);
      setCategory(updated);
    } catch (err) {
      setError(`Erreur upload image: ${err.message}`);
    }
  };

  // Gestionnaire pour supprimer une image
  const handleDeleteImage = async (entityId) => {
    try {
      await deleteImage(entityId);
      const effectiveId = currentId || paramId;
      const updated = await getCategoryById(effectiveId);
      setCategory(updated);
    } catch (err) {
      setError(`Erreur suppression image: ${err.message}`);
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (entity, activeTab, formProps = {}) => {
    const { editable, register, control, errors, setValue } = formProps;
    const effectiveId = currentId || paramId;

    switch (activeTab) {
      case 'general':
        // Mode édition et création utilisent maintenant la même approche
        if (editable) {
          // Extraction sécurisée des props
          const register = formProps?.register || (() => {});
          const control = formProps?.control || {};
          const errors = formProps?.errors || {};

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Informations générales
                </h2>

                <div className="space-y-4">
                  {/* Nom */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Nom
                    </h3>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Entrez le nom..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Description
                    </h3>
                    <textarea
                      {...register('description')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white min-h-[100px]"
                      placeholder="Entrez une description..."
                    />
                  </div>

                  {/* Statut */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Statut
                    </h3>
                    <select
                      {...register('status')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="published">Publié</option>
                      <option value="draft">Brouillon</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                {/* Catégorie parent */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Catégorie parent
                  </h3>
                  {control && (
                    <Controller
                      name="parent_id"
                      control={control}
                      render={({ field }) => (
                        <HierarchicalParentSelector
                          hierarchicalData={hierarchicalCategories}
                          value={field.value}
                          onChange={field.onChange}
                          currentCategoryId={isNew ? null : effectiveId}
                          placeholder="Sélectionner une catégorie parent"
                        />
                      )}
                    />
                  )}
                </div>

                {/* Options */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Options
                  </h3>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <input
                        id="is_featured"
                        type="checkbox"
                        {...register('is_featured')}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="is_featured"
                        className="ml-2 text-gray-700 dark:text-gray-300"
                      >
                        Catégorie mise en avant
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          // Mode lecture
          return (
            <GeneralInfoTab
              entity={entity}
              fields={['name', 'description', 'parent_id', 'status']}
              productCount={entity?.productCount || 0}
              editable={false}
            />
          );
        }

      case 'images':
        return (
          <ImagesTab
            entity={entity}
            entityId={effectiveId}
            entityType="category"
            galleryMode={false}
            onUploadImage={handleUploadImage}
            onDeleteImage={handleDeleteImage}
            isLoading={loading}
            error={error}
          />
        );

      case 'woocommerce':
        // Dans l'onglet WooCommerce, on n'affiche que le statut de synchronisation
        // Les champs meta sont accessibles en mode édition directement dans le formulaire
        if (editable) {
          // Champs méta pour l'édition
          const metaFields = {
            meta_title: {
              type: 'text',
              label: 'Titre Meta',
            },
            meta_description: {
              type: 'textarea',
              label: 'Description Meta',
              rows: 3,
            },
            meta_keywords: {
              type: 'text',
              label: 'Mots-clés Meta',
              helpText: 'Séparés par des virgules',
            },
          };

          return (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Métadonnées SEO</h3>
                {Object.entries(metaFields).map(([fieldName, fieldConfig]) => (
                  <div key={fieldName} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {fieldConfig.label}
                    </label>
                    {fieldConfig.type === 'textarea' ? (
                      <textarea
                        {...register(fieldName)}
                        rows={fieldConfig.rows || 3}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 
                                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                                  shadow-sm px-3 py-2"
                      />
                    ) : (
                      <input
                        type={fieldConfig.type}
                        {...register(fieldName)}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 
                                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 
                                  shadow-sm px-3 py-2"
                      />
                    )}
                    {fieldConfig.helpText && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {fieldConfig.helpText}
                      </p>
                    )}
                    {errors && errors[fieldName] && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors[fieldName].message}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <WooCommerceTab entity={entity} entityType="category" onSync={handleSync} />
            </div>
          );
        } else {
          // En mode lecture, seulement le composant WooCommerceTab
          return <WooCommerceTab entity={entity} entityType="category" onSync={handleSync} />;
        }

      default:
        return null;
    }
  };

  // Onglets visibles selon le mode
  const visibleTabs = isNew ? [{ id: 'general', label: 'Général' }] : ENTITY_CONFIG.tabs;

  return (
    <EntityDetail
      entity={category}
      entityId={currentId || paramId}
      entityName="catégorie"
      entityNamePlural="catégories"
      baseRoute="/products/categories"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={ENTITY_CONFIG.syncEnabled}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={loading || hierarchyLoading}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={getValidationSchema()}
      defaultValues={defaultValues}
      formTitle={isNew ? 'Nouvelle catégorie' : `Modifier ${category?.name || 'la catégorie'}`}
    />
  );
}

export default CategorieDetail;

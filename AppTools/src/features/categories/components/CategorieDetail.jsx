// src/features/categories/components/CategorieDetail.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import { ENTITY_CONFIG } from '../constants';

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
      const options = transformToOptions(hierarchicalCategories);
      setParentCategories(options);
    }
  }, [hierarchicalCategories, transformToOptions]);

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

        // 🆔 Extraire proprement l’ID
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
    const { editable, register, errors } = formProps;
    const effectiveId = currentId || paramId;

    switch (activeTab) {
      case 'general':
        // Construire les champs à afficher
        const fields = ['name', 'description', 'parent_id'];

        // Ajouter les champs spéciaux si en mode édition
        const specialFields = editable
          ? {
              parent_id: {
                type: 'select',
                options: [{ value: '', label: 'Aucune (catégorie racine)' }, ...parentCategories],
              },
              is_featured: {
                type: 'checkbox',
                label: 'Catégorie mise en avant',
              },
              status: {
                type: 'select',
                label: 'Statut',
                options: [
                  { value: 'published', label: 'Publié' },
                  { value: 'draft', label: 'Brouillon' },
                ],
              },
            }
          : {};

        return (
          <GeneralInfoTab
            entity={entity}
            fields={fields}
            specialFields={specialFields}
            editable={editable}
            register={register}
            errors={errors}
          />
        );

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

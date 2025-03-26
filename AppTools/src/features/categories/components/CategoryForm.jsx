// src/features/categories/components/CategoryForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as yup from 'yup';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import { ENTITY_CONFIG } from '../constants';

function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks Zustand
  const { getCategoryById, createCategory, updateCategory } = useCategory();
  const { uploadImage, deleteImage } = useCategoryExtras();

  // Utiliser useHierarchicalCategories au lieu de useCategoryHierarchyStore
  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  // États locaux
  const [category, setCategory] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [wsInitialized, setWsInitialized] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const hasTabs = ENTITY_CONFIG.tabs && ENTITY_CONFIG.tabs.length > 0;
  const [activeTab, setActiveTab] = useState(hasTabs ? 'general' : null);

  // Schéma de validation Yup pour les catégories
  const schema = yup.object().shape({
    name: yup.string().required('Le nom est requis'),
    description: yup.string(),
    parent_id: yup.string().nullable(),
    status: yup.string().required('Le statut est requis'),
    is_featured: yup.boolean(),
    meta_title: yup.string(),
    meta_description: yup.string(),
    meta_keywords: yup.string(),
  });

  // Initialiser les WebSockets une seule fois
  useEffect(() => {
    if (!wsInitialized) {
      console.log('[CATEGORY_FORM] Initialisation WebSocket');
      const cleanup = initWebSocketListeners();
      setWsInitialized(true);

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [initWebSocketListeners, wsInitialized]);

  // Transformer les catégories hiérarchiques en options pour le menu déroulant
  const transformToOptions = useCallback(
    (categories, prefix = '') => {
      if (!Array.isArray(categories)) {
        console.warn("transformToOptions: categories n'est pas un tableau", categories);
        return [];
      }

      let options = [];

      categories.forEach((category) => {
        // Vérifier que la catégorie est un objet valide
        if (!category || typeof category !== 'object') {
          return;
        }

        // Éviter d'inclure la catégorie en cours d'édition dans les options de parent
        if (!isNew && category._id === id) {
          return;
        }

        options.push({
          value: category._id,
          label: prefix + (category.name || 'Sans nom'),
        });

        if (category.children && Array.isArray(category.children) && category.children.length > 0) {
          options = [...options, ...transformToOptions(category.children, prefix + '— ')];
        }
      });

      return options;
    },
    [id, isNew]
  );

  // Charger les données initiales une seule fois
  useEffect(() => {
    if (!dataFetched) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
          // Charger les données hiérarchiques pour le menu déroulant
          await fetchHierarchicalCategories();

          // Si on est en mode édition et qu'on a un ID
          if (!isNew && id) {
            const categoryData = await getCategoryById(id);
            setCategory(categoryData);
          }

          setDataFetched(true);
        } catch (err) {
          console.error('Erreur lors du chargement des données:', err);
          setError('Erreur lors du chargement des données. Veuillez réessayer.');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [dataFetched, id, isNew, fetchHierarchicalCategories, getCategoryById]);

  // Mettre à jour les options de catégories parentes lorsque les données hiérarchiques changent
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

  // Préparation des champs du formulaire avec les options de catégories parentes
  const getFormFields = useCallback(() => {
    // Clone des champs de configuration
    const fields = [...ENTITY_CONFIG.formFields];

    // Trouver et mettre à jour le champ parent_id avec les options disponibles
    const parentField = fields.find((field) => field.name === 'parent_id');
    if (parentField) {
      parentField.options = [
        { value: '', label: 'Aucune (catégorie racine)' },
        ...parentCategories,
      ];
    }

    // Ajouter des champs supplémentaires non présents dans la configuration de base
    fields.push(
      {
        name: 'status',
        label: 'Statut',
        type: 'select',
        required: true,
        options: [
          { value: 'published', label: 'Publié' },
          { value: 'draft', label: 'Brouillon' },
        ],
        tab: 'general',
      },
      {
        name: 'is_featured',
        label: 'Catégorie mise en avant',
        type: 'checkbox',
        tab: 'general',
      },
      {
        name: 'meta_title',
        label: 'Titre Meta',
        type: 'text',
        tab: 'woocommerce',
      },
      {
        name: 'meta_description',
        label: 'Description Meta',
        type: 'textarea',
        rows: 3,
        tab: 'woocommerce',
      },
      {
        name: 'meta_keywords',
        label: 'Mots-clés Meta',
        type: 'text',
        helpText: 'Séparés par des virgules',
        tab: 'woocommerce',
      }
    );

    // Ajouter l'attribut tab à tous les champs qui n'en ont pas
    fields.forEach((field) => {
      if (!field.tab) {
        field.tab = 'general';
      }
    });

    return fields;
  }, [parentCategories]);

  // Valeurs initiales pour le formulaire
  const getInitialValues = useCallback(() => {
    if (isNew) {
      return {
        name: '',
        description: '',
        parent_id: '',
        status: 'draft',
        is_featured: false,
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
      };
    }

    return category || {};
  }, [category, isNew]);

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Création d'une copie des données
      const formattedData = { ...data };

      // 1. Traitement des champs selon leur type
      Object.keys(formattedData).forEach((field) => {
        const value = formattedData[field];

        // Déterminer le type de traitement pour chaque champ
        switch (field) {
          // Champs qui doivent être null quand vides
          case 'parent_id':
            if (value === '') formattedData[field] = null;
            break;

          // Champs à exclure systématiquement
          case 'woo_id':
          case 'last_sync':
          case 'createdAt':
          case 'updatedAt':
          case 'pending_sync':
          case '_id':
          case '__v':
          case 'created_at':
          case 'updated_at':
          case 'level':
          case 'product_count':
          case 'gallery_images':
            delete formattedData[field];
            break;

          // Traitement par défaut pour les autres champs
          default:
            // Supprimer les champs vides
            if (value === '') {
              delete formattedData[field];
            }
            break;
        }
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('Données catégorie formatées pour API:', formattedData);
      }

      // 2. Exécution de la requête API appropriée
      if (isNew) {
        const newCategory = await createCategory(formattedData);
        setSuccess('Catégorie créée avec succès');
        navigate('/products/categories');
        return newCategory;
      } else {
        const updatedCategory = await updateCategory(id, formattedData);
        setSuccess('Catégorie mise à jour avec succès');
        setCategory((prev) => updatedCategory || { ...prev, ...formattedData });
        return updatedCategory;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Problème lors de la sauvegarde';
      console.error('Erreur lors de la sauvegarde de la catégorie:', err);
      setError(`Erreur: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/categories/' : `/products/categories/${id}`);
  };

  // Gestionnaire pour l'upload d'image
  const handleUploadImage = async (entityId, imageFile) => {
    try {
      setLoading(true);
      await uploadImage(entityId, imageFile);
      // Recharger les données de la catégorie après upload
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Échec de l'upload d'image.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour supprimer une image
  const handleDeleteImage = async (entityId) => {
    try {
      setLoading(true);
      await deleteImage(entityId);
      // Recharger les données de la catégorie après suppression
      const updatedCategory = await getCategoryById(id);
      setCategory(updatedCategory);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Échec de la suppression d'image.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (tabId) => {
    if (tabId === 'images' && category) {
      return (
        <EntityImageManager
          entity={category}
          entityId={id}
          entityType="category"
          galleryMode={false}
          onUploadImage={handleUploadImage}
          onDeleteImage={handleDeleteImage}
          isLoading={loading}
          error={error}
        />
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Formulaire principal */}
      {(!id || (id && category) || isNew) && (
        <EntityForm
          fields={getFormFields()}
          schema={schema}
          entityName="catégorie"
          isNew={isNew}
          initialValues={getInitialValues()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={loading || hierarchyLoading}
          error={error}
          successMessage={success}
          buttonLabel={isNew ? 'Créer la catégorie' : 'Mettre à jour la catégorie'}
          formTitle={isNew ? 'Nouvelle catégorie' : `Modifier ${category?.name || 'la catégorie'}`}
          layout="tabs"
          tabs={ENTITY_CONFIG.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      {/* Contenu des onglets spécifiques */}
      {!isNew && category && activeTab !== 'general' && activeTab !== 'woocommerce' && (
        <div className="mt-6">{renderTabContent(activeTab)}</div>
      )}
    </div>
  );
}

export default CategoryForm;

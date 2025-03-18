// src/features/categories/components/CategoryForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as yup from 'yup';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { useCategory, useCategoryExtras } from '../contexts/categoryContext';
import { ENTITY_CONFIG } from '../constants';

function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  // Hooks de contexte
  const { getCategoryById, createCategory, updateCategory } = useCategory();

  // Hooks supplémentaires pour les catégories
  const { uploadImage, deleteImage, getHierarchicalCategories } = useCategoryExtras();

  // États locaux
  const [category, setCategory] = useState(null);
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const hasTabs = ENTITY_CONFIG.tabs && ENTITY_CONFIG.tabs.length > 0;
  const [activeTab, setActiveTab] = useState(hasTabs ? 'general' : null);

  // Schéma de validation Yup pour les catégories
  const schema = yup.object().shape({
    name: yup.string().required('Le nom est requis'),
    slug: yup.string(),
    description: yup.string(),
    parent_id: yup.string().nullable(),
    status: yup.string().required('Le statut est requis'),
    is_featured: yup.boolean(),
    meta_title: yup.string(),
    meta_description: yup.string(),
    meta_keywords: yup.string(),
  });

  // Charger les données de la catégorie et les catégories parentes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isMounted) return;

      setLoading(true);
      setError(null);

      try {
        // Charger les catégories parentes pour le menu déroulant
        const hierarchicalData = await getHierarchicalCategories();
        if (!isMounted) return;

        const options = transformToOptions(hierarchicalData);
        setParentCategories(options);

        // Si on est en mode édition et qu'on a un ID
        if (!isNew && id) {
          const categoryData = await getCategoryById(id);
          if (!isMounted) return;
          setCategory(categoryData);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Erreur lors du chargement des données:', err);
        setError('Erreur lors du chargement des données. Veuillez réessayer.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Nettoyage
    return () => {
      isMounted = false;
    };
  }, [id, isNew]); // Suppression des dépendances qui pourraient causer une boucle

  // Transformer les catégories hiérarchiques en options pour le menu déroulant
  const transformToOptions = (categories, prefix = '') => {
    let options = [];

    categories.forEach((category) => {
      // Éviter d'inclure la catégorie en cours d'édition dans les options de parent
      if (!isNew && category._id === id) {
        return;
      }

      options.push({
        value: category._id,
        label: prefix + category.name,
      });

      if (category.children && category.children.length > 0) {
        options = [...options, ...transformToOptions(category.children, prefix + '— ')];
      }
    });

    return options;
  };

  // Préparation des champs du formulaire avec les options de catégories parentes
  const getFormFields = () => {
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
  };

  // Valeurs initiales pour le formulaire
  const getInitialValues = () => {
    if (isNew) {
      return {
        name: '',
        slug: '',
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
  };

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Nettoyage des données selon le schéma de validation du backend
      const formattedData = { ...data };

      // Traiter les chaînes vides comme undefined pour qu'elles ne soient pas envoyées
      // au backend (le backend conservera la valeur existante)
      Object.keys(formattedData).forEach((key) => {
        if (formattedData[key] === '') {
          delete formattedData[key]; // Ne pas envoyer ce champ plutôt que d'envoyer null
        }
      });

      // Traitement spécifique pour parent_id s'il est vide
      if (formattedData.parent_id === '') {
        formattedData.parent_id = null; // La catégorie racine a parent_id = null
      }

      // Supprimer le champ level s'il existe - il est calculé automatiquement par le contrôleur
      delete formattedData.level;

      // Supprimer d'autres champs qui ne sont pas dans le schéma de validation
      const fieldsToExclude = [
        'woo_id',
        'last_sync',
        'createdAt',
        'updatedAt',
        'pending_sync',
        '_id',
        '__v',
        'product_count',
        'gallery_images',
      ];

      fieldsToExclude.forEach((field) => {
        delete formattedData[field];
      });

      console.log('Données formatées pour API:', formattedData);

      if (isNew) {
        await createCategory(formattedData);
        setSuccess('Catégorie créée avec succès');
        navigate('/products/categories');
      } else {
        await updateCategory(id, formattedData);
        setSuccess('Catégorie mise à jour avec succès');
        // Mise à jour locale au lieu d'une requête API supplémentaire
        setCategory((prev) => ({ ...prev, ...formattedData }));
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la catégorie:', err);
      if (err.response) {
        console.error("Détails de l'erreur:", err.response.data);
        setError(`Erreur: ${err.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde de la catégorie. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products/categories/' : `/products/categories/${id}`);
  };

  // Rendu conditionnel de l'onglet images
  const renderImageTab = () => {
    if (activeTab !== 'images' || !category) return null;

    return (
      <EntityImageManager
        entity={category}
        entityId={id}
        entityType="category"
        galleryMode={false}
        onUploadImage={(id, file) => uploadImage(id, file)}
        onDeleteImage={(id) => deleteImage(id)}
        isLoading={loading}
      />
    );
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
          isLoading={loading}
          error={error}
          successMessage={success}
          buttonLabel={isNew ? 'Créer la catégorie' : 'Mettre à jour la catégorie'}
          formTitle={isNew ? 'Nouvelle catégorie' : `Modifier ${category?.name || 'la catégorie'}`}
          layout={hasTabs ? 'tabs' : 'default'}
          tabs={hasTabs ? ENTITY_CONFIG.tabs : []}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {/* Gestionnaire d'images (affiché uniquement en mode édition) */}
      {!isNew && category && renderImageTab()}
    </div>
  );
}

export default CategoryForm;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as yup from 'yup';
import { EntityForm } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { useProduct } from '../contexts/productContext';
import apiService from '../../../services/api';

function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { createProduct, updateProduct, getProductById } = useProduct();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [relatedData, setRelatedData] = useState({
    categories: [],
    brands: [],
    suppliers: [],
  });
  const hasTabs = ENTITY_CONFIG.tabs && ENTITY_CONFIG.tabs.length > 0;
  const [activeTab, setActiveTab] = useState(hasTabs ? 'general' : null);

  // Créer un schéma de validation Yup différent selon le mode (création ou édition)
  const getValidationSchema = () => {
    // Schéma pour la création (validation complète)
    if (isNew) {
      return yup.object().shape({
        name: yup.string().required('Le nom est requis'),
        sku: yup.string().transform((value) => (value === null ? '' : value)),
        description: yup.string().transform((value) => (value === null ? '' : value)),
        price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .required('Le prix est requis')
          .typeError('Le prix doit être un nombre'),
        regular_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .typeError('Le prix régulier doit être un nombre'),
        sale_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .typeError('Le prix promotionnel doit être un nombre'),
        purchase_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .typeError("Le prix d'achat doit être un nombre"),
        stock: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .required('Le stock est requis')
          .typeError('Le stock doit être un nombre'),
        min_stock: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .typeError('Le stock minimum doit être un nombre'),
        manage_stock: yup.boolean().default(false),
        status: yup.string().default('draft'),
        category_id: yup.string().nullable(),
        categories: yup.array().of(yup.string()).default([]),
        brand_id: yup.string().nullable(),
        supplier_id: yup.string().nullable(),
      });
    }
    // Schéma pour l'édition (tous les champs optionnels)
    else {
      return yup.object().shape({
        name: yup.string().optional(),
        sku: yup
          .string()
          .transform((value) => (value === null ? '' : value))
          .optional(),
        description: yup
          .string()
          .transform((value) => (value === null ? '' : value))
          .optional(),
        price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .optional()
          .typeError('Le prix doit être un nombre'),
        regular_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .optional()
          .typeError('Le prix régulier doit être un nombre'),
        sale_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .optional()
          .typeError('Le prix promotionnel doit être un nombre'),
        purchase_price: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .optional()
          .typeError("Le prix d'achat doit être un nombre"),
        stock: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .optional()
          .typeError('Le stock doit être un nombre'),
        min_stock: yup
          .number()
          .transform((value, originalValue) =>
            originalValue === '' || originalValue === null ? undefined : value
          )
          .nullable()
          .optional()
          .typeError('Le stock minimum doit être un nombre'),
        manage_stock: yup.boolean().optional(),
        status: yup.string().optional(),
        category_id: yup.string().nullable().optional(),
        categories: yup.array().of(yup.string()).optional(),
        brand_id: yup.string().nullable().optional(),
        supplier_id: yup.string().nullable().optional(),
      });
    }
  };

  // Récupérer les données du produit en mode édition
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getProductById(id)
      .then(setProduct)
      .catch(() => setError('Erreur lors de la récupération du produit.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Récupérer les listes déroulantes (catégories, marques, fournisseurs)
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true);

        const [categoriesResponse, brandsResponse, suppliersResponse] = await Promise.all([
          apiService.get('/api/categories'),
          apiService.get('/api/brands'),
          apiService.get('/api/suppliers'),
        ]);

        setRelatedData({
          categories: categoriesResponse.data.data || [],
          brands: brandsResponse.data.data || [],
          suppliers: suppliersResponse.data.data || [],
        });

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données pour le formulaire.');
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Préparer les champs du formulaire avec les options
  const formFields = ENTITY_CONFIG.formFields.map((field) => {
    let updatedField = { ...field };

    // Ajouter les onglets à chaque champ
    if (['name', 'sku', 'description', 'status'].includes(field.name)) {
      updatedField.tab = 'general';
    } else if (['price', 'regular_price', 'sale_price', 'purchase_price'].includes(field.name)) {
      updatedField.tab = 'general';
    } else if (['stock', 'min_stock', 'manage_stock'].includes(field.name)) {
      updatedField.tab = 'inventory';
    } else if (['category_id', 'categories', 'brand_id', 'supplier_id'].includes(field.name)) {
      updatedField.tab = 'inventory';
    }

    // Ajouter les options pour les listes déroulantes
    if (field.name === 'category_id') {
      updatedField.options = relatedData.categories.map((cat) => ({
        value: cat._id,
        label: cat.name,
      }));
    } else if (field.name === 'categories') {
      updatedField.options = relatedData.categories.map((cat) => ({
        value: cat._id,
        label: cat.name,
      }));
    } else if (field.name === 'brand_id') {
      updatedField.options = relatedData.brands.map((brand) => ({
        value: brand._id,
        label: brand.name,
      }));
    } else if (field.name === 'supplier_id') {
      updatedField.options = relatedData.suppliers.map((supplier) => ({
        value: supplier._id,
        label: supplier.name,
      }));
    }

    return updatedField;
  });

  // Valeurs initiales pour le formulaire
  const getInitialValues = () => {
    if (isNew) {
      return {
        name: '',
        sku: '',
        description: '',
        price: '',
        regular_price: '',
        sale_price: '',
        purchase_price: '',
        stock: '',
        min_stock: '',
        manage_stock: false,
        status: 'draft',
        category_id: '',
        categories: [],
        brand_id: '',
        supplier_id: '',
      };
    }

    return product || {};
  };

  // Version simplifiée du gestionnaire de soumission
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prétraitement des données pour gérer les cas spéciaux
      const processedData = { ...data };

      // S'assurer que description et sku ne sont jamais null
      if (processedData.description === null || processedData.description === undefined) {
        processedData.description = '';
      }
      if (processedData.sku === null || processedData.sku === undefined) {
        processedData.sku = '';
      }

      // Traitement différent selon le mode création ou édition
      if (isNew) {
        // En mode création, on envoie toutes les données
        console.log('Données produit pour création:', processedData);
        await createProduct(processedData);
        setSuccess('Produit créé avec succès');
        navigate('/products');
      } else {
        // En mode édition, on ne récupère que les champs modifiés
        const initialValues = getInitialValues();
        const updates = {};

        // Parcourir chaque champ et comparer avec la valeur initiale
        Object.keys(processedData).forEach((key) => {
          // Ignorer les champs systèmes
          if (
            [
              '_id',
              '__v',
              'createdAt',
              'updatedAt',
              'woo_id',
              'last_sync',
              'pending_sync',
              'created_at',
              'updated_at',
            ].includes(key)
          ) {
            return;
          }

          const initialValue = initialValues[key];
          const newValue = processedData[key];

          // Traitement spécifique selon le type de champ
          let hasChanged = false;

          // Pour les tableaux (comme categories)
          if (Array.isArray(newValue) && Array.isArray(initialValue)) {
            const sortedNew = [...newValue].sort();
            const sortedOld = [...initialValue].sort();
            hasChanged = JSON.stringify(sortedNew) !== JSON.stringify(sortedOld);
          }
          // Pour les champs numériques
          else if (
            [
              'price',
              'regular_price',
              'sale_price',
              'purchase_price',
              'stock',
              'min_stock',
            ].includes(key)
          ) {
            const newNum = newValue === '' || newValue === null ? null : Number(newValue);
            const oldNum =
              initialValue === '' || initialValue === null ? null : Number(initialValue);
            hasChanged = newNum !== oldNum;

            if (hasChanged) {
              updates[key] = newNum;
            }
          }
          // Pour les champs texte spéciaux (sku, description)
          else if (['sku', 'description'].includes(key)) {
            const newStr = newValue === null ? '' : String(newValue);
            const oldStr = initialValue === null ? '' : String(initialValue);
            hasChanged = newStr !== oldStr;

            if (hasChanged) {
              updates[key] = newStr;
            }
          }
          // Pour les champs qui peuvent être null
          else if (['category_id', 'brand_id', 'supplier_id'].includes(key)) {
            const newVal = newValue === '' ? null : newValue;
            const oldVal = initialValue === '' ? null : initialValue;
            hasChanged = newVal !== oldVal;

            if (hasChanged) {
              updates[key] = newVal;
            }
          }
          // Cas général
          else if (newValue !== initialValue) {
            updates[key] = newValue;
          }
        });

        if (Object.keys(updates).length === 0) {
          setSuccess('Aucune modification détectée');
        } else {
          console.log('Données modifiées pour API:', updates);
          await updateProduct(id, updates);
          setSuccess('Produit mis à jour avec succès');
          setProduct((prev) => ({ ...prev, ...updates }));
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde du produit:', err);
      if (err.response) {
        console.error("Détails de l'erreur:", err.response.data);
        setError(`Erreur: ${err.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde du produit. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    navigate(isNew ? '/products' : `/products/${id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Formulaire principal */}
      {(!id || (id && product)) && (
        <EntityForm
          fields={formFields}
          entityName="produit"
          isNew={isNew}
          initialValues={getInitialValues()}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={loading}
          error={error}
          successMessage={success}
          buttonLabel={isNew ? 'Créer le produit' : 'Mettre à jour le produit'}
          formTitle={isNew ? 'Nouveau produit' : `Modifier ${product?.name || 'le produit'}`}
          layout={hasTabs ? 'tabs' : 'default'}
          tabs={hasTabs ? ENTITY_CONFIG.tabs : []}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          schema={getValidationSchema()} // Schéma de validation différent selon le mode
        />
      )}
    </div>
  );
}

export default ProductForm;

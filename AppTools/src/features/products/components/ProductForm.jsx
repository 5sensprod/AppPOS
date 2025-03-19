// src/features/products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityForm } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { useProduct } from '../contexts/productContext';
import apiService from '../../../services/api';
import * as yup from 'yup';

// ... Puis modifiez le composant ProductForm comme ceci

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

  // Créer un schéma de validation Yup pour le formulaire
  const productSchema = yup.object().shape({
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
    // ... [aucun changement dans cette partie]
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
      // Vérifier et corriger manuellement certains champs problématiques
      // avant le traitement par Yup
      const fixedData = { ...data };

      // S'assurer que description n'est jamais null
      if (fixedData.description === null || fixedData.description === undefined) {
        fixedData.description = '';
      }

      // S'assurer que sku n'est jamais null
      if (fixedData.sku === null || fixedData.sku === undefined) {
        fixedData.sku = '';
      }

      // Gérer les champs de prix vides
      const priceFields = ['regular_price', 'sale_price', 'purchase_price'];
      priceFields.forEach((field) => {
        if (fixedData[field] === '' || fixedData[field] === null) {
          fixedData[field] = null; // Pour la base de données
          delete fixedData[field]; // Ne pas inclure dans les mises à jour
        }
      });

      // Traitement simple : Yup s'est déjà occupé des conversions de types
      if (isNew) {
        // En mode création, on envoie tout
        console.log('Données produit pour création:', fixedData);
        await createProduct(fixedData);
        setSuccess('Produit créé avec succès');
        navigate('/products');
      } else {
        // En mode mise à jour, on ne récupère que les champs modifiés
        const initialValues = getInitialValues();
        const updates = {};

        // Comparer et ne garder que ce qui a changé
        Object.keys(fixedData).forEach((key) => {
          // Ignorer les champs système
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
          const newValue = fixedData[key];

          // Comparer les valeurs de manière appropriée selon le type
          if (Array.isArray(newValue) && Array.isArray(initialValue)) {
            // Pour les tableaux, comparaison indépendante de l'ordre
            const sortedNew = [...newValue].sort();
            const sortedInit = [...initialValue].sort();
            if (JSON.stringify(sortedNew) !== JSON.stringify(sortedInit)) {
              updates[key] = newValue;
            }
          } else if (
            (newValue === '' && (initialValue === null || initialValue === '')) ||
            (newValue === null && (initialValue === '' || initialValue === null))
          ) {
            // Ne pas considérer comme modifié si vide <-> null ou vide <-> vide
            // Rien à faire
          } else if (newValue !== initialValue) {
            updates[key] = newValue;
          }
        });

        // S'il n'y a pas de modifications, afficher un message
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
          schema={productSchema} // Passez le schéma Yup au composant EntityForm
        />
      )}
    </div>
  );
}

export default ProductForm;

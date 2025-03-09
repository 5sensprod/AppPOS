// src/features/products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Formatage des données
    const formattedData = { ...data };

    // Convertir les chaînes vides en null
    ['sku', 'category_id', 'brand_id', 'supplier_id'].forEach((field) => {
      if (formattedData[field] === '') formattedData[field] = null;
    });

    // Convertir les valeurs numériques
    ['price', 'regular_price', 'sale_price', 'purchase_price', 'stock', 'min_stock'].forEach(
      (field) => {
        if (formattedData[field]) formattedData[field] = Number(formattedData[field]);
      }
    );

    try {
      if (isNew) {
        await createProduct(formattedData);
        setSuccess('Produit créé avec succès');
        navigate('/products');
      } else {
        await updateProduct(id, formattedData);
        setSuccess('Produit mis à jour avec succès');
        // Recharger les données du produit
        const updatedProduct = await getProductById(id);
        setProduct(updatedProduct);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du produit:', error);
      if (error.response) {
        console.error("Détails de l'erreur:", error.response.data);
        setError(`Erreur: ${error.response.data.error || 'Problème lors de la sauvegarde'}`);
      } else {
        setError('Erreur lors de la sauvegarde du produit. Veuillez réessayer.');
      }
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
        />
      )}
    </div>
  );
}

export default ProductForm;

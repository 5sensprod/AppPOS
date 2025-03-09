// src/features/products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createEntityForm } from '../../../factories/createEntityForm';
import { ENTITY_CONFIG } from '../constants';
import { useProduct } from '../contexts/productContext';
import apiService from '../../../services/api';

// Créer le formulaire de base avec la factory
const ProductFormBase = createEntityForm({
  entityName: ENTITY_CONFIG.name,
  formFields: ENTITY_CONFIG.formFields,
  cancelPath: '/products',
});

function ProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { createProduct, updateProduct, getProductById } = useProduct();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Récupérer les données du produit en mode édition
  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        try {
          setLoading(true);
          const productData = await getProductById(id);
          setProduct(productData);
          setLoading(false);
        } catch (error) {
          console.error('Erreur lors de la récupération du produit:', error);
          setError('Erreur lors de la récupération du produit. Veuillez réessayer.');
          setLoading(false);
        }
      };

      fetchProduct();
    }
  }, [isEditing, id, getProductById]);

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

        setCategories(categoriesResponse.data.data || []);
        setBrands(brandsResponse.data.data || []);
        setSuppliers(suppliersResponse.data.data || []);

        setLoading(false);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données pour le formulaire.');
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Préparer les options pour les listes déroulantes
  const formFieldsWithOptions = ENTITY_CONFIG.formFields.map((field) => {
    if (field.name === 'category_id') {
      return {
        ...field,
        options: categories.map((category) => ({
          value: category._id,
          label: category.name,
        })),
      };
    }

    if (field.name === 'categories') {
      return {
        ...field,
        options: categories.map((category) => ({
          value: category._id,
          label: category.name,
        })),
      };
    }

    if (field.name === 'brand_id') {
      return {
        ...field,
        options: brands.map((brand) => ({
          value: brand._id,
          label: brand.name,
        })),
      };
    }

    if (field.name === 'supplier_id') {
      return {
        ...field,
        options: suppliers.map((supplier) => ({
          value: supplier._id,
          label: supplier.name,
        })),
      };
    }

    return field;
  });

  // Soumission du formulaire
  const handleSubmit = async (formData) => {
    try {
      setLoading(true);

      // Formater les données
      const formattedData = { ...formData };

      // Supprimer les champs vides
      Object.keys(formattedData).forEach((key) => {
        if (formattedData[key] === '') {
          delete formattedData[key];
        } else if (typeof formattedData[key] === 'object' && formattedData[key] !== null) {
          Object.keys(formattedData[key]).forEach((subKey) => {
            if (formattedData[key][subKey] === '') {
              delete formattedData[key][subKey];
            }
          });
        }
      });

      // Convertir les valeurs numériques
      ['price', 'regular_price', 'sale_price', 'purchase_price', 'stock', 'min_stock'].forEach(
        (field) => {
          if (formattedData[field]) formattedData[field] = Number(formattedData[field]);
        }
      );

      // S'assurer que categories est un tableau
      if (formattedData.categories && !Array.isArray(formattedData.categories)) {
        formattedData.categories = [formattedData.categories];
      }

      console.log('Données formatées:', formattedData);

      if (isEditing) {
        await updateProduct(id, formattedData);
      } else {
        await createProduct(formattedData);
      }

      setLoading(false);
      navigate('/products');
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
      if (error.response?.data) {
        console.error('Détails:', error.response.data);
        setError(`Erreur: ${error.response.data.error || "Problème d'enregistrement"}`);
      } else {
        setError("Erreur lors de l'enregistrement du produit. Veuillez vérifier vos données.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {isEditing ? 'Modifier le produit' : 'Ajouter un produit'}
      </h1>

      {loading && !product && isEditing ? (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
          Chargement du produit...
        </div>
      ) : (
        <ProductFormBase
          initialData={product || {}}
          isEditing={isEditing}
          isLoading={loading}
          error={error}
          onSubmit={handleSubmit}
          formFields={formFieldsWithOptions}
        />
      )}
    </div>
  );
}

export default ProductForm;

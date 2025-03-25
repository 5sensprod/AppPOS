// src/features/products/components/ProductForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EntityForm, EntityImageManager } from '../../../components/common';
import { ENTITY_CONFIG } from '../constants';
import { useProduct, useProductExtras } from '../stores/productStore'; // Zustand hook
import apiService from '../../../services/api';
import getValidationSchema from './validationSchema/getValidationSchema';

function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  // Utiliser les hooks Zustand au lieu du contexte
  const { createProduct, updateProduct, getProductById, syncProduct } = useProduct();
  const { uploadImage, deleteImage, setMainImage, uploadGalleryImage, deleteGalleryImage } =
    useProductExtras();

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
  }, [id, getProductById]);

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
        price: null,
        regular_price: null,
        sale_price: null,
        purchase_price: null,
        stock: 0,
        min_stock: null,
        manage_stock: false,
        status: 'draft',
        category_id: null,
        categories: [],
        brand_id: null,
        supplier_id: null,
        // Ajouter des champs vides pour les références
        category_ref: null,
        categories_refs: [],
        brand_ref: null,
        supplier_ref: null,
      };
    }

    // En mode édition, s'assurer que les valeurs null ou undefined sont correctement traitées
    const safeProduct = { ...product };
    if (!safeProduct) return {};

    // Normaliser les valeurs pour éviter les problèmes
    return {
      ...safeProduct,
      sku: safeProduct.sku === null || safeProduct.sku === undefined ? '' : safeProduct.sku,
      description:
        safeProduct.description === null || safeProduct.description === undefined
          ? ''
          : safeProduct.description,
      price: safeProduct.price === '' ? null : safeProduct.price,
      regular_price: safeProduct.regular_price === '' ? null : safeProduct.regular_price,
      sale_price: safeProduct.sale_price === '' ? null : safeProduct.sale_price,
      purchase_price: safeProduct.purchase_price === '' ? null : safeProduct.purchase_price,
      stock: safeProduct.stock === null || safeProduct.stock === undefined ? 0 : safeProduct.stock,
      min_stock: safeProduct.min_stock === '' ? null : safeProduct.min_stock,
      category_id: safeProduct.category_id === '' ? null : safeProduct.category_id,
      categories: Array.isArray(safeProduct.categories) ? safeProduct.categories : [],
      brand_id: safeProduct.brand_id === '' ? null : safeProduct.brand_id,
      supplier_id: safeProduct.supplier_id === '' ? null : safeProduct.supplier_id,
    };
  };

  // Pré-traiter les données avant soumission
  const preprocessData = (data) => {
    const processedData = { ...data };

    // Traiter les chaînes vides comme null pour les ID de relation
    if (processedData.category_id === '') processedData.category_id = null;
    if (processedData.brand_id === '') processedData.brand_id = null;
    if (processedData.supplier_id === '') processedData.supplier_id = null;

    // S'assurer que description et sku ne sont jamais null
    if (processedData.description === null || processedData.description === undefined) {
      processedData.description = '';
    }
    if (processedData.sku === null || processedData.sku === undefined) {
      processedData.sku = '';
    }

    // S'assurer que stock est au moins 0
    if (processedData.stock === null || processedData.stock === undefined) {
      processedData.stock = 0;
    }

    // Ajouter les références aux entités liées
    // Ces champs seront remplis côté serveur lors de la création/mise à jour
    if (processedData.category_id) {
      const category = relatedData.categories.find((cat) => cat._id === processedData.category_id);
      if (category) {
        processedData.category_ref = {
          id: category._id,
          name: category.name,
        };
      }
    }

    if (processedData.brand_id) {
      const brand = relatedData.brands.find((b) => b._id === processedData.brand_id);
      if (brand) {
        processedData.brand_ref = {
          id: brand._id,
          name: brand.name,
        };
      }
    }

    if (processedData.supplier_id) {
      const supplier = relatedData.suppliers.find((s) => s._id === processedData.supplier_id);
      if (supplier) {
        processedData.supplier_ref = {
          id: supplier._id,
          name: supplier.name,
        };
      }
    }

    if (Array.isArray(processedData.categories) && processedData.categories.length > 0) {
      processedData.categories_refs = processedData.categories
        .map((catId) => {
          const category = relatedData.categories.find((cat) => cat._id === catId);
          if (category) {
            return {
              id: category._id,
              name: category.name,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    return processedData;
  };

  // Version simplifiée du gestionnaire de soumission
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prétraitement des données pour gérer les cas spéciaux
      const processedData = preprocessData(data);

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

            if (hasChanged) {
              updates[key] = newValue;
            }
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
            const newNum = newValue === '' || newValue === undefined ? null : Number(newValue);
            const oldNum =
              initialValue === '' || initialValue === undefined ? null : Number(initialValue);
            hasChanged = newNum !== oldNum;

            if (hasChanged) {
              updates[key] = newNum;
            }
          }
          // Pour les champs texte spéciaux (sku, description)
          else if (['sku', 'description'].includes(key)) {
            const newStr = newValue === null || newValue === undefined ? '' : String(newValue);
            const oldStr =
              initialValue === null || initialValue === undefined ? '' : String(initialValue);
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

        // Ajouter les références supplémentaires des entités liées
        if (updates.category_id !== undefined) {
          const categoryId = updates.category_id;
          if (categoryId) {
            const category = relatedData.categories.find((cat) => cat._id === categoryId);
            if (category) {
              updates.category_ref = {
                id: category._id,
                name: category.name,
              };
            }
          } else {
            updates.category_ref = null;
          }
        }

        if (updates.brand_id !== undefined) {
          const brandId = updates.brand_id;
          if (brandId) {
            const brand = relatedData.brands.find((b) => b._id === brandId);
            if (brand) {
              updates.brand_ref = {
                id: brand._id,
                name: brand.name,
              };
            }
          } else {
            updates.brand_ref = null;
          }
        }

        if (updates.supplier_id !== undefined) {
          const supplierId = updates.supplier_id;
          if (supplierId) {
            const supplier = relatedData.suppliers.find((s) => s._id === supplierId);
            if (supplier) {
              updates.supplier_ref = {
                id: supplier._id,
                name: supplier.name,
              };
            }
          } else {
            updates.supplier_ref = null;
          }
        }

        if (updates.categories !== undefined) {
          const categoryIds = updates.categories;
          if (Array.isArray(categoryIds) && categoryIds.length > 0) {
            updates.categories_refs = categoryIds
              .map((catId) => {
                const category = relatedData.categories.find((cat) => cat._id === catId);
                if (category) {
                  return {
                    id: category._id,
                    name: category.name,
                  };
                }
                return null;
              })
              .filter(Boolean);
          } else {
            updates.categories_refs = [];
          }
        }

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

  // Gestionnaire de synchronisation
  const handleSync = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      await syncProduct(id);
      setSuccess('Produit synchronisé avec succès');
      // Recharger les données
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError('Erreur lors de la synchronisation du produit');
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour l'upload d'image
  const handleUploadImage = async (entityId, imageFile) => {
    try {
      setLoading(true);
      await uploadImage(entityId, imageFile);
      // Recharger les données du produit après upload
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image:", error);
      setError("Échec de l'upload d'image.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour télécharger une image de galerie
  const handleUploadGalleryImage = async (entityId, imageFile) => {
    try {
      setLoading(true);
      await uploadGalleryImage(entityId, imageFile);
      // Recharger les données du produit après upload
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de l'upload d'image de galerie:", error);
      setError("Échec de l'upload d'image de galerie.");
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
      // Recharger les données du produit après suppression
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image:", error);
      setError("Échec de la suppression d'image.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour supprimer une image de galerie
  const handleDeleteGalleryImage = async (entityId, imageIndex) => {
    try {
      setLoading(true);
      await deleteGalleryImage(entityId, imageIndex);
      // Recharger les données du produit après suppression
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la suppression d'image de galerie:", error);
      setError("Échec de la suppression d'image de galerie.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire pour définir l'image principale
  const handleSetMainImage = async (entityId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(entityId, imageIndex);
      // Recharger les données du produit
      const updatedProduct = await getProductById(id);
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale:", error);
      setError("Échec de la définition de l'image principale.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Rendu du contenu des onglets
  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'general':
      case 'inventory':
        return null; // Géré par EntityForm
      case 'images':
        if (!product) return null;
        return (
          <EntityImageManager
            entity={product}
            entityId={id}
            entityType="product"
            galleryMode={true}
            onUploadImage={handleUploadImage}
            onUploadGalleryImage={handleUploadGalleryImage}
            onDeleteImage={handleDeleteImage}
            onDeleteGalleryImage={handleDeleteGalleryImage}
            onSetMainImage={handleSetMainImage}
            isLoading={loading}
            error={error}
          />
        );
      case 'woocommerce':
        if (!product) return null;
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Informations WooCommerce
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Statut de synchronisation:
                  </span>
                  <div>
                    {product.woo_id ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Synchronisé
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Non synchronisé
                      </span>
                    )}

                    {product.pending_sync && (
                      <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Modifié
                      </span>
                    )}
                  </div>
                </div>

                {product.woo_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID WooCommerce:</span>
                    <span className="font-mono text-sm">{product.woo_id}</span>
                  </div>
                )}

                {product.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Statut WooCommerce:</span>
                    <span className="capitalize">
                      {product.status === 'published'
                        ? 'Publié'
                        : product.status === 'draft'
                          ? 'Brouillon'
                          : product.status === 'archived'
                            ? 'Archivé'
                            : product.status}
                    </span>
                  </div>
                )}

                {product.last_sync && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Dernière synchronisation:
                    </span>
                    <span>{new Date(product.last_sync).toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleSync}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    {product.woo_id ? 'Resynchroniser' : 'Synchroniser avec WooCommerce'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
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
          layout="tabs"
          tabs={ENTITY_CONFIG.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          schema={getValidationSchema(isNew)} // Schéma de validation différent selon le mode
        />
      )}

      {/* Contenu des onglets spécifiques */}
      {!isNew && product && (activeTab === 'images' || activeTab === 'woocommerce') && (
        <div className="mt-6">{renderTabContent(activeTab)}</div>
      )}
    </div>
  );
}

export default ProductForm;

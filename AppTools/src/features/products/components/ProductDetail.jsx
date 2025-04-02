// src/features/products/components/ProductDetail.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { useHierarchicalCategories } from '../../categories/stores/categoryHierarchyStore';
import { EntityDetail } from '../../../components/common';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import ProductPriceSection from './ProductPriceSection';
import InventoryTab from './tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';
import getValidationSchema from './validationSchema/getValidationSchema';
import { ENTITY_CONFIG } from '../constants';
import apiService from '../../../services/api';

function ProductDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);

  // État pour stocker les données liées (marques, fournisseurs)
  const [relatedData, setRelatedData] = useState({
    brands: [],
    suppliers: [],
  });

  // État pour éviter les appels API multiples
  const [dataFetched, setDataFetched] = useState(false);

  // Utiliser les hooks Zustand pour les produits
  const { getProductById, createProduct, updateProduct, deleteProduct, syncProduct } = useProduct();
  const { uploadImage, deleteImage, setMainImage } = useProductExtras();

  // Utiliser le hook pour les catégories hiérarchiques
  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners: initCategoryWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  // État pour le WebSocket
  const [wsInitialized, setWsInitialized] = useState(false);

  const validationSchema = getValidationSchema(isNew);

  const defaultValues = {
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
    brand_ref: null,
    supplier_ref: null,
  };

  // Initialiser les WebSockets une seule fois
  useEffect(() => {
    if (!wsInitialized) {
      console.log('[PRODUCT_DETAIL] Initialisation WebSocket pour les catégories');
      const cleanup = initCategoryWebSocketListeners();
      setWsInitialized(true);

      return () => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [initCategoryWebSocketListeners, wsInitialized]);

  // Récupérer les données uniquement lors du premier rendu
  useEffect(() => {
    if (dataFetched) return;

    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Récupérer les catégories hiérarchiques
        await fetchHierarchicalCategories();

        // Récupérer les marques et fournisseurs
        const [brandsResponse, suppliersResponse] = await Promise.all([
          apiService.get('/api/brands'),
          apiService.get('/api/suppliers'),
        ]);

        setRelatedData({
          brands: brandsResponse.data.data || [],
          suppliers: suppliersResponse.data.data || [],
        });

        setDataFetched(true);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Erreur lors de la récupération des données pour le formulaire.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [fetchHierarchicalCategories, dataFetched]);

  // Chargement du produit lors du premier rendu ou du changement d'ID
  useEffect(() => {
    const effectiveId = currentId || paramId;

    if (isNew) {
      setProduct(defaultValues);
      return;
    }

    if (!effectiveId) return;

    setLoading(true);
    getProductById(effectiveId)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        console.error('Erreur de récupération du produit:', err);
        setError(`Erreur lors de la récupération du produit: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [currentId, paramId, isNew, getProductById]);

  // Transformer les catégories hiérarchiques en options pour le select
  const transformCategoryOptions = useCallback((categories, prefix = '') => {
    if (!Array.isArray(categories)) return [];

    let options = [];

    categories.forEach((category) => {
      if (!category || typeof category !== 'object') return;

      options.push({
        value: category._id,
        label: prefix + (category.name || 'Sans nom'),
      });

      if (category.children && Array.isArray(category.children) && category.children.length > 0) {
        options = [...options, ...transformCategoryOptions(category.children, prefix + '— ')];
      }
    });

    return options;
  }, []);

  // Calculer les options de catégories une seule fois quand les données changent
  const categoryOptions = useMemo(() => {
    return transformCategoryOptions(hierarchicalCategories);
  }, [hierarchicalCategories, transformCategoryOptions]);

  // Calculer les options de marques et fournisseurs une seule fois quand les données changent
  const brandOptions = useMemo(() => {
    return relatedData.brands.map((brand) => ({
      value: brand._id,
      label: brand.name,
    }));
  }, [relatedData.brands]);

  const supplierOptions = useMemo(() => {
    return relatedData.suppliers.map((supplier) => ({
      value: supplier._id,
      label: supplier.name,
    }));
  }, [relatedData.suppliers]);

  // Pré-traiter les données avant soumission
  const preprocessData = useCallback(
    (data) => {
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

      // Construire les informations de catégorie au nouveau format
      const categoryRefs = [];

      // Traiter les catégories multiples
      if (Array.isArray(processedData.categories) && processedData.categories.length > 0) {
        processedData.categories.forEach((catId) => {
          const catOption = categoryOptions.find((opt) => opt.value === catId);
          if (catOption) {
            const catName = catOption.label.replace(/^—\s*/g, ''); // Retirer les tirets de préfixe

            // Trouver l'objet catégorie dans la hiérarchie
            const findCategoryInHierarchy = (categories, id) => {
              for (const cat of categories) {
                if (cat._id === id) return cat;
                if (cat.children && cat.children.length > 0) {
                  const found = findCategoryInHierarchy(cat.children, id);
                  if (found) return found;
                }
              }
              return null;
            };

            const category = findCategoryInHierarchy(hierarchicalCategories, catId);

            categoryRefs.push({
              id: catId,
              name: catName,
              woo_id: category?.woo_id || null,
              path: category?.path || [catName],
              path_ids: category?.path_ids || [catId],
              path_string: category?.path_string || catName,
            });
          }
        });
      }

      // Ajouter category_info au lieu des anciens champs
      if (categoryRefs.length > 0) {
        processedData.category_info = {
          refs: categoryRefs,
          primary: categoryRefs[0],
        };
      } else {
        processedData.category_info = {
          refs: [],
          primary: null,
        };
      }

      // Ajouter les références aux marques
      if (processedData.brand_id) {
        const brand = relatedData.brands.find((b) => b._id === processedData.brand_id);
        if (brand) {
          processedData.brand_ref = {
            id: brand._id,
            name: brand.name,
          };
        }
      }

      // Ajouter les références aux fournisseurs
      if (processedData.supplier_id) {
        const supplier = relatedData.suppliers.find((s) => s._id === processedData.supplier_id);
        if (supplier) {
          processedData.supplier_ref = {
            id: supplier._id,
            name: supplier.name,
          };
        }
      }

      return processedData;
    },
    [categoryOptions, relatedData.brands, relatedData.suppliers, hierarchicalCategories]
  );

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Prétraitement des données pour gérer les relations
      const processedData = preprocessData(data);

      console.log('Données produit traitées:', processedData);

      if (isNew) {
        const created = await createProduct(processedData);

        // Pour debugging, log la réponse complète
        console.log('Réponse API createProduct:', created);

        // Essayer plusieurs façons possibles d'extraire l'ID
        let newId = null;

        if (created?.id) {
          newId = created.id;
        } else if (created?._id) {
          newId = created._id;
        } else if (created?.data?.id) {
          newId = created.data.id;
        } else if (created?.data?._id) {
          newId = created.data._id;
        } else if (typeof created === 'string') {
          // Si l'API retourne directement l'ID comme string
          newId = created;
        }

        if (!newId) {
          console.error('Réponse API complète:', created);
          throw new Error("L'identifiant du produit créé est introuvable dans la réponse API.");
        }

        // Mettre à jour l'état local avant la redirection
        setCurrentId(newId);

        // Définir le succès
        setSuccess('Produit créé avec succès');

        // Charger les données du produit avant la redirection
        const newProduct = await getProductById(newId);
        setProduct(newProduct);

        // Rediriger après tout le traitement
        navigate(`/products/${newId}`, { replace: true });
      } else {
        const effectiveId = currentId || paramId;
        await updateProduct(effectiveId, processedData);
        setSuccess('Produit mis à jour avec succès');

        // Recharger le produit mis à jour
        const updated = await getProductById(effectiveId);
        setProduct(updated);
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await deleteProduct(effectiveId);
      navigate('/products');
    } catch (err) {
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/products');
    } else {
      const effectiveId = currentId || paramId;
      navigate(`/products/${effectiveId}`);
    }
  };

  const handleUploadImage = async (entityId, file) => {
    try {
      await uploadImage(entityId, file);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
    } catch (err) {
      setError(`Erreur upload image: ${err.message}`);
    }
  };

  const handleDeleteImage = async (entityId) => {
    try {
      await deleteImage(entityId);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
    } catch (err) {
      setError(`Erreur suppression image: ${err.message}`);
    }
  };

  const handleSetMainImage = async (entityId, imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(entityId, imageIndex);

      const effectiveId = currentId || paramId;
      const updatedProduct = await getProductById(effectiveId);

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

  // Fonction pour synchroniser le produit avec WooCommerce
  const handleSync = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await syncProduct(effectiveId);

      // Recharger le produit pour obtenir les informations à jour
      const updatedProduct = await getProductById(effectiveId);
      setProduct(updatedProduct);

      setSuccess('Produit synchronisé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      setError('Erreur lors de la synchronisation du produit');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Mémoriser les champs améliorés pour éviter de les recréer à chaque rendu
  const enhancedInventoryFields = useMemo(() => {
    return {
      category_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucune catégorie' }, ...categoryOptions],
      },
      categories: {
        type: 'multiselect',
        options: categoryOptions,
      },
      brand_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucune marque' }, ...brandOptions],
      },
      supplier_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucun fournisseur' }, ...supplierOptions],
      },
    };
  }, [categoryOptions, brandOptions, supplierOptions]);

  // Mémoriser la fonction renderTabContent pour éviter de la recréer à chaque rendu
  const renderTabContent = useCallback(
    (entity, activeTab, formProps = {}) => {
      const { editable, register, errors } = formProps;

      switch (activeTab) {
        case 'general':
          return (
            <GeneralInfoTab
              entity={entity}
              fields={['name', 'sku', 'description', 'status']}
              editable={editable}
              additionalSection={
                <ProductPriceSection
                  product={entity}
                  editable={editable}
                  register={register}
                  errors={errors}
                />
              }
            />
          );
        case 'inventory':
          return (
            <InventoryTab
              product={entity}
              editable={editable}
              register={register}
              errors={errors}
              specialFields={editable ? enhancedInventoryFields : {}} // Passer les champs avec les options
            />
          );
        case 'images':
          return (
            <ImagesTab
              entity={entity}
              entityId={currentId || paramId}
              entityType="product"
              galleryMode={true}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
              onSetMainImage={handleSetMainImage}
              isLoading={loading}
              error={error}
            />
          );
        case 'woocommerce':
          return <WooCommerceTab entity={entity} entityType="product" onSync={handleSync} />;
        default:
          return null;
      }
    },
    [
      currentId,
      paramId,
      loading,
      error,
      enhancedInventoryFields,
      handleUploadImage,
      handleDeleteImage,
      handleSetMainImage,
      syncProduct,
    ]
  );

  // Mémoriser les onglets visibles
  const visibleTabs = useMemo(() => {
    return isNew
      ? ENTITY_CONFIG.tabs.filter((tab) => !['images', 'woocommerce'].includes(tab.id))
      : ENTITY_CONFIG.tabs;
  }, [isNew]);

  const isLoadingData = loading || hierarchyLoading;

  return (
    <EntityDetail
      entity={product}
      entityId={currentId || paramId}
      entityName="produit"
      entityNamePlural="produits"
      baseRoute="/products"
      tabs={visibleTabs}
      renderTabContent={renderTabContent}
      actions={['edit', 'delete']}
      syncEnabled={true}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      onSync={handleSync}
      isLoading={isLoadingData}
      title={isNew ? 'Ajouter un produit' : `Modifier « ${product?.name || ''} »`}
      error={error}
      success={success}
      editable={isEditMode}
      validationSchema={validationSchema}
      defaultValues={defaultValues}
    />
  );
}

export default ProductDetail;

// src/features/products/hooks/useProductDetail.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { useCategoryUtils } from '../../../hooks/useCategoryUtils'; // ✅ IMPORT DU HOOK OPTIMISÉ
import { ENTITY_CONFIG } from '../constants';
import getValidationSchema from '../components/validationSchema/getValidationSchema';
import apiService from '../../../services/api';

export default function useProductDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const { getProductById, createProduct, updateProduct, deleteProduct, syncProduct } = useProduct();
  const productExtras = useProductExtras();

  // ✅ REMPLACER useHierarchicalCategories par useCategoryUtils
  const {
    hierarchicalCategories,
    categoriesLoading,
    getCategoryOptions,
    buildCategoryInfo,
    enrichProductWithCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    isReady: categoryUtilsReady,
  } = useCategoryUtils();

  const [product, setProduct] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);

  const [relatedData, setRelatedData] = useState({ brands: [], suppliers: [] });

  // WebSocket init pour les mises à jour de produits
  useEffect(() => {
    // Initialisation du WebSocket principal via le hook useCategoryUtils
    const cleanup = initWebSocketListeners();

    // Importation directe du service WebSocket pour les produits
    import('../../../services/websocketService')
      .then((module) => {
        const websocketService = module.default;

        if (!websocketService) {
          console.error('[PRODUCT_DETAIL] Service WebSocket non trouvé');
          return;
        }

        const effectiveId = currentId || paramId;

        if (!effectiveId) {
          console.log("[PRODUCT_DETAIL] Pas d'ID de produit, pas d'écouteur WebSocket");
          return;
        }

        console.log(
          `[PRODUCT_DETAIL] Configuration de l'écouteur WebSocket pour le produit ${effectiveId}`
        );

        // Fonction de gestion des événements de mise à jour
        const handleProductUpdate = (payload) => {
          if (payload?.entityId === effectiveId) {
            console.log(
              `[PRODUCT_DETAIL] Mise à jour WebSocket pour le produit ${effectiveId}, rechargement`
            );
            getProductById(effectiveId)
              .then((updatedProduct) => {
                setProduct(updatedProduct);
              })
              .catch((err) => console.error('[PRODUCT_DETAIL] Erreur lors du rechargement:', err));
          }
        };

        // S'abonner aux événements
        websocketService.on('products.updated', handleProductUpdate);
        websocketService.subscribe('products');
      })
      .catch((err) => {
        console.error("[PRODUCT_DETAIL] Erreur lors de l'import du service WebSocket:", err);
      });

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initWebSocketListeners, currentId, paramId, getProductById]);

  // Fetch all data (brands, suppliers, categories)
  useEffect(() => {
    if (dataFetched) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // ✅ Le hook useCategoryUtils gère déjà le fetch des catégories
        await fetchHierarchicalCategories();

        const [brands, suppliers] = await Promise.all([
          apiService.get('/api/brands'),
          apiService.get('/api/suppliers'),
        ]);

        setRelatedData({
          brands: brands?.data?.data || [],
          suppliers: suppliers?.data?.data || [],
        });

        setDataFetched(true);
      } catch (err) {
        setError('Erreur chargement des données liées');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [dataFetched, fetchHierarchicalCategories]);

  // Load product if not new
  useEffect(() => {
    if (isNew) {
      setProduct(defaultValues);
      return;
    }

    if (!paramId) return;

    setLoading(true);
    getProductById(paramId)
      .then((data) => setProduct(data))
      .catch((err) => {
        console.error(err);
        setError(`Erreur récupération produit: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [paramId, isNew, getProductById]);

  // Utils: option builders avec tri alphabétique et support des images
  const toOptions = (items, includeRelations = false) =>
    items
      .map((i) => ({
        value: i._id,
        label: i.name,
        image: i.image ? { src: i.image } : null,
        ...(includeRelations && {
          suppliers: i.suppliers || [],
          brands: i.brands || [],
        }),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

  // ✅ UTILISER getCategoryOptions du hook useCategoryUtils au lieu de logique custom
  const categoryOptions = useMemo(() => {
    return getCategoryOptions({
      includeEmpty: false,
      sortAlphabetically: false,
      prefix: '— ',
      format: 'hierarchical',
    });
  }, [getCategoryOptions]);

  const brandOptions = useMemo(() => toOptions(relatedData.brands, true), [relatedData.brands]);

  const supplierOptions = useMemo(
    () => toOptions(relatedData.suppliers, true),
    [relatedData.suppliers]
  );

  // ✅ UTILISER buildCategoryInfo du hook au lieu de logique custom
  const preprocessData = useCallback(
    (data) => {
      const d = { ...data };

      // Nettoyage des champs de base
      if (!d.category_id) d.category_id = null;
      if (!d.brand_id) d.brand_id = null;
      if (!d.supplier_id) d.supplier_id = null;
      d.description ||= '';
      d.sku ||= '';
      d.stock ||= 0;

      // CORRECTION: Nettoyage et synchronisation des catégories
      console.log('🔍 PreprocessData - Données reçues:', {
        category_id: d.category_id,
        categories: d.categories,
      });

      // S'assurer que categories est un tableau
      if (!Array.isArray(d.categories)) {
        d.categories = [];
      }

      // Nettoyer le tableau des catégories
      d.categories = d.categories.filter((catId) => catId && catId.trim() !== '');

      // Si category_id est défini mais pas dans categories, l'ajouter
      if (d.category_id && !d.categories.includes(d.category_id)) {
        d.categories.push(d.category_id);
      }

      // Si category_id n'est pas défini mais qu'il y a des catégories, prendre la première
      if (!d.category_id && d.categories.length > 0) {
        d.category_id = d.categories[0];
      }

      console.log('✅ PreprocessData - Données synchronisées:', {
        category_id: d.category_id,
        categories: d.categories,
      });

      // ✅ UTILISER buildCategoryInfo du hook useCategoryUtils
      d.category_info = buildCategoryInfo(d.categories);

      // Construction des références de marque et fournisseur
      if (d.brand_id) {
        const brand = relatedData.brands.find((b) => b._id === d.brand_id);
        if (brand) {
          d.brand_ref = { id: brand._id, name: brand.name };
        } else {
          d.brand_id = null;
          d.brand_ref = null;
        }
      } else {
        d.brand_ref = null;
      }

      if (d.supplier_id) {
        const supplier = relatedData.suppliers.find((s) => s._id === d.supplier_id);
        if (supplier) {
          d.supplier_ref = { id: supplier._id, name: supplier.name };
        } else {
          d.supplier_id = null;
          d.supplier_ref = null;
        }
      } else {
        d.supplier_ref = null;
      }

      console.log('📦 PreprocessData - Résultat final:', {
        category_id: d.category_id,
        categories: d.categories,
        category_info: d.category_info,
        brand_ref: d.brand_ref,
        supplier_ref: d.supplier_ref,
      });

      return d;
    },
    [buildCategoryInfo, relatedData]
  );

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Vérifier si le champ name est vide ou non défini
      if (!data.name || data.name.trim() === '') {
        if (data.designation && data.designation.trim() !== '') {
          data.name = data.designation;
        } else if (data.sku && data.sku.trim() !== '') {
          data.name = data.sku;
        } else {
          data.name = `Produit ${new Date().toISOString()}`;
        }
      }

      const processed = preprocessData(data);

      if (isNew) {
        const requiredFields = ['name'];
        const missingFields = requiredFields.filter(
          (field) => !processed[field] || processed[field].trim() === ''
        );

        if (missingFields.length > 0) {
          throw new Error(`Champs requis manquants: ${missingFields.join(', ')}`);
        }

        const created = await createProduct(processed);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;

        if (!newId) {
          throw new Error('Aucun ID retourné par la création du produit');
        }

        setCurrentId(newId);
        setSuccess('Produit créé');

        const newData = await getProductById(newId);
        setProduct(newData);
        navigate(`/products/${newId}`, { replace: true });
      } else {
        await updateProduct(paramId, processed);
        const updated = await getProductById(paramId);
        setProduct(updated);
        setSuccess('Produit mis à jour');
      }
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteProduct(paramId);
      navigate('/products');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/products');
    } else {
      navigate(`/products/${paramId}`);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await syncProduct(paramId);
      const updated = await getProductById(paramId);
      setProduct(updated);
      setSuccess('Produit synchronisé');
    } catch (err) {
      setError('Erreur sync');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour la gestion des images (inchangées)
  const handleUploadImage = async (entityId, file) => {
    try {
      setLoading(true);
      await productExtras.uploadGalleryImage(entityId, file);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
      return true;
    } catch (err) {
      console.error("Erreur lors de l'upload d'image:", err);
      setError(`Erreur upload image: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (entityId, imageIdOrIndex) => {
    try {
      setLoading(true);
      console.log("Tentative de suppression d'image:", { entityId, imageIdOrIndex });

      const currentProduct = await getProductById(entityId);
      console.log('Images dans la galerie:', currentProduct?.gallery_images);

      let imageIndex = -1;

      if (typeof imageIdOrIndex === 'number') {
        imageIndex = imageIdOrIndex;
        console.log('Index numérique détecté:', imageIndex);
      } else if (currentProduct?.gallery_images) {
        imageIndex = currentProduct.gallery_images.findIndex(
          (img) =>
            img._id === imageIdOrIndex ||
            img.id === imageIdOrIndex ||
            img.imageId === imageIdOrIndex
        );
        console.log("Index trouvé à partir de l'ID:", imageIndex);
      }

      if (imageIndex === -1 && currentProduct?.gallery_images?.length > 0) {
        console.log('Image non trouvée par ID, tentative avec la première image');
        imageIndex = 0;
      }

      if (
        imageIndex === -1 ||
        !currentProduct?.gallery_images ||
        imageIndex >= currentProduct.gallery_images.length
      ) {
        console.error("Index d'image invalide:", imageIndex);
        throw new Error("Index d'image invalide ou galerie vide");
      }

      console.log(
        "Suppression de l'image à l'index:",
        imageIndex,
        currentProduct.gallery_images[imageIndex]
      );

      await productExtras.deleteGalleryImage(entityId, imageIndex);

      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
      return true;
    } catch (err) {
      console.error("Erreur lors de la suppression d'image:", err);
      setError(`Erreur suppression image: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSetMainImage = async (entityId, imageIndex) => {
    try {
      setLoading(true);
      await productExtras.setMainImage(entityId, imageIndex);
      const effectiveId = currentId || paramId;
      const updated = await getProductById(effectiveId);
      setProduct(updated);
      return true;
    } catch (err) {
      console.error("Erreur lors de la définition de l'image principale:", err);
      setError(`Échec de la définition de l'image principale: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    product,
    // ✅ UTILISER categoriesLoading du hook useCategoryUtils
    loading: loading || categoriesLoading,
    error,
    success,
    isNew,
    editable: isEditMode,
    currentId: currentId || paramId,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    validationSchema: getValidationSchema(isNew),
    defaultValues,
    categoryOptions,
    brandOptions,
    supplierOptions,
    uploadImage: handleUploadImage,
    deleteImage: handleDeleteImage,
    setMainImage: handleSetMainImage,
    hierarchicalCategories,
    // ✅ EXPOSER les utilitaires de catégories pour usage avancé si nécessaire
    categoryUtils: {
      enrichProductWithCategories,
      buildCategoryInfo,
      getCategoryOptions,
      isReady: categoryUtilsReady,
    },
  };
}

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
  margin_rate: null,
  margin_amount: null,
  tax_rate: 20,
  promo_rate: null,
  promo_amount: null,
};

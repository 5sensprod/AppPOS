// src/features/products/hooks/useProductDetail.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { useHierarchicalCategories } from '../../categories/stores/categoryHierarchyStore';
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
  // Obtenir les fonctions correctes du hook useProductExtras
  const productExtras = useProductExtras();

  const [product, setProduct] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);

  const [relatedData, setRelatedData] = useState({ brands: [], suppliers: [] });

  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  // WebSocket init pour les mises à jour de produits
  useEffect(() => {
    // Initialisation du WebSocket principal via le hook existant
    const cleanup = initWebSocketListeners();

    // Importation directe du service WebSocket
    // Cette approche est similaire à celle utilisée dans useBrandDetail
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

        // S'assurer que nous sommes abonnés au canal products
        websocketService.subscribe('products');
      })
      .catch((err) => {
        console.error("[PRODUCT_DETAIL] Erreur lors de l'import du service WebSocket:", err);
      });

    // Nettoyage lors du démontage
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }

      // Le désabonnement se fait automatiquement lors du démontage
      // car nous avons utilisé import dynamique, le websocketService
      // n'est pas disponible dans cette portée
    };
  }, [initWebSocketListeners, currentId, paramId, getProductById]);

  // Fetch all data (brands, suppliers, categories)
  useEffect(() => {
    if (dataFetched) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
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

  // Utils: option builders
  const toOptions = (items, includeRelations = false) =>
    items.map((i) => ({
      value: i._id,
      label: i.name,
      ...(includeRelations && {
        suppliers: i.suppliers || [],
        brands: i.brands || [],
      }),
    }));

  const categoryOptions = useMemo(() => {
    const transform = (cats, prefix = '') => {
      return cats.flatMap((cat) => [
        { value: cat._id, label: prefix + cat.name },
        ...(cat.children ? transform(cat.children, prefix + '— ') : []),
      ]);
    };
    return transform(hierarchicalCategories);
  }, [hierarchicalCategories]);

  const brandOptions = useMemo(() => toOptions(relatedData.brands, true), [relatedData.brands]);

  const supplierOptions = useMemo(
    () => toOptions(relatedData.suppliers, true),
    [relatedData.suppliers]
  );

  // Submission
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

      // Nettoyer le tableau des catégories (supprimer les valeurs vides/null/undefined)
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

      // Construction de category_info améliorée
      // Compatible avec votre architecture hierarchicalCategories existante
      const buildCategoryInfo = () => {
        if (!d.categories || d.categories.length === 0) {
          return { refs: [], primary: null };
        }

        // Fonction pour construire les références de catégories avec leurs chemins
        const buildCategoryRefs = (categoryIds) => {
          const refs = [];
          const processedPaths = new Set();

          categoryIds.forEach((catId) => {
            const category = categoryOptions.find((c) => c.value === catId);
            if (category) {
              // Analyser le label pour déduire la hiérarchie (avec les tirets —)
              const level = (category.label.match(/—/g) || []).length;
              const cleanName = category.label.replace(/^—+\s*/, '');

              // Construire le chemin hiérarchique en analysant la position dans categoryOptions
              let path = [cleanName];
              let pathIds = [catId];

              if (level > 0) {
                // Trouver les catégories parentes en remontant dans categoryOptions
                const currentIndex = categoryOptions.findIndex((c) => c.value === catId);
                let parentPath = [];
                let parentIds = [];

                // Remonter pour trouver les parents (catégories avec moins de tirets)
                for (let i = currentIndex - 1; i >= 0; i--) {
                  const potentialParent = categoryOptions[i];
                  const parentLevel = (potentialParent.label.match(/—/g) || []).length;

                  if (parentLevel < level) {
                    const cleanParentName = potentialParent.label.replace(/^—+\s*/, '');
                    parentPath.unshift(cleanParentName);
                    parentIds.unshift(potentialParent.value);

                    // Continuer jusqu'à trouver tous les parents
                    if (parentLevel === 0) break; // Racine atteinte
                  }
                }

                path = [...parentPath, cleanName];
                pathIds = [...parentIds, catId];
              }

              // Ajouter toutes les catégories de ce chemin aux refs (parents + enfant)
              for (let i = 0; i < path.length; i++) {
                const pathKey = pathIds.slice(0, i + 1).join('->');

                if (!processedPaths.has(pathKey)) {
                  processedPaths.add(pathKey);

                  refs.push({
                    id: pathIds[i],
                    name: path[i],
                    path: path.slice(0, i + 1),
                    path_ids: pathIds.slice(0, i + 1),
                    path_string: path.slice(0, i + 1).join(' > '),
                    level: i,
                    woo_id: null,
                  });
                }
              }
            }
          });

          return refs.sort((a, b) => {
            // Trier par niveau puis par nom
            if (a.level !== b.level) return a.level - b.level;
            return a.name.localeCompare(b.name);
          });
        };

        const refs = buildCategoryRefs(d.categories);

        // Déterminer la catégorie principale
        let primary = null;
        if (d.category_id) {
          // Chercher la catégorie principale dans les refs
          primary = refs.find((ref) => ref.id === d.category_id);

          if (!primary) {
            // Si pas trouvée, la créer à partir de categoryOptions
            const category = categoryOptions.find((c) => c.value === d.category_id);
            if (category) {
              const cleanName = category.label.replace(/^—+\s*/, '');
              primary = {
                id: d.category_id,
                name: cleanName,
                path: [cleanName],
                path_ids: [d.category_id],
                path_string: cleanName,
                level: 0,
                woo_id: null,
              };
            }
          }
        } else if (refs.length > 0) {
          // Si pas de catégorie principale définie, prendre la première
          primary = refs[0];
          d.category_id = refs[0].id;
        }

        return { refs, primary };
      };

      d.category_info = buildCategoryInfo();

      // Construction des références de marque et fournisseur
      if (d.brand_id) {
        const brand = relatedData.brands.find((b) => b._id === d.brand_id);
        if (brand) {
          d.brand_ref = { id: brand._id, name: brand.name };
        } else {
          // Si la marque n'existe plus, nettoyer
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
          // Si le fournisseur n'existe plus, nettoyer
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
    [categoryOptions, relatedData]
  );

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Vérifier si le champ name est vide ou non défini
      if (!data.name || data.name.trim() === '') {
        // Utiliser designation si disponible
        if (data.designation && data.designation.trim() !== '') {
          data.name = data.designation;
        }
        // Sinon utiliser SKU si disponible
        else if (data.sku && data.sku.trim() !== '') {
          data.name = data.sku;
        }
        // Sinon, nom par défaut
        else {
          data.name = `Produit ${new Date().toISOString()}`;
        }
      }

      const processed = preprocessData(data);

      if (isNew) {
        // Validation avant envoi
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
    navigate(isNew ? '/products' : `/products/${paramId}`);
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

  // Fonctions corrigées pour la gestion des images
  const handleUploadImage = async (entityId, file) => {
    try {
      setLoading(true);
      // Utiliser la fonction correcte du hook useProductExtras
      await productExtras.uploadGalleryImage(entityId, file);
      const effectiveId = currentId || paramId;
      // Rafraîchir les données du produit
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

      // Récupérer le produit actuel pour avoir les données à jour
      const currentProduct = await getProductById(entityId);
      console.log('Images dans la galerie:', currentProduct?.gallery_images);

      // Déterminer si imageIdOrIndex est un index numérique ou un ID string
      let imageIndex = -1;

      if (typeof imageIdOrIndex === 'number') {
        // Si c'est déjà un index numérique, l'utiliser directement
        imageIndex = imageIdOrIndex;
        console.log('Index numérique détecté:', imageIndex);
      } else if (currentProduct?.gallery_images) {
        // Sinon, essayer de trouver l'index par ID
        // Tester plusieurs propriétés possibles où l'ID pourrait se trouver
        imageIndex = currentProduct.gallery_images.findIndex(
          (img) =>
            img._id === imageIdOrIndex ||
            img.id === imageIdOrIndex ||
            img.imageId === imageIdOrIndex
        );
        console.log("Index trouvé à partir de l'ID:", imageIndex);
      }

      // Si on n'a toujours pas trouvé l'index, essayer de traiter l'image comme étant la première
      if (imageIndex === -1 && currentProduct?.gallery_images?.length > 0) {
        console.log('Image non trouvée par ID, tentative avec la première image');
        imageIndex = 0;
      }

      // Vérifier si nous avons un index valide
      if (
        imageIndex === -1 ||
        !currentProduct?.gallery_images ||
        imageIndex >= currentProduct.gallery_images.length
      ) {
        console.error("Index d'image invalide:", imageIndex);
        throw new Error("Index d'image invalide ou galerie vide");
      }

      // Log l'image qu'on va supprimer
      console.log(
        "Suppression de l'image à l'index:",
        imageIndex,
        currentProduct.gallery_images[imageIndex]
      );

      // Appeler la fonction avec l'index trouvé
      await productExtras.deleteGalleryImage(entityId, imageIndex);

      // Rafraîchir les données du produit
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
      // Rafraîchir les données du produit
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
    loading: loading || hierarchyLoading,
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
    // Exposer les fonctions corrigées
    uploadImage: handleUploadImage,
    deleteImage: handleDeleteImage,
    setMainImage: handleSetMainImage,
    hierarchicalCategories,
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
  promo_rate: null, // 🆕 NOUVEAU CHAMP
  promo_amount: null,
};

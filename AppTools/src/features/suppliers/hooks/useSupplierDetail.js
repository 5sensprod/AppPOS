// src/features/suppliers/hooks/useSupplierDetail.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSupplierDataStore, useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { useBrand } from '../../brands/stores/brandStore';
import { getSupplierValidationSchema } from '../components/validationSchema/getValidationSchema';
import imageProxyService from '../../../services/imageProxyService';

export default function useSupplierDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const { getSupplierById, createSupplier, updateSupplier, deleteSupplier } = useSupplier();
  const supplierExtras = useSupplierExtras();

  const [supplier, setSupplier] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dataFetched, setDataFetched] = useState(false);

  const [relatedData, setRelatedData] = useState({ brands: [] });

  const supplierWsStore = useSupplierDataStore();
  const { fetchBrands } = useBrand();

  // WebSocket init pour les mises à jour de fournisseurs
  useEffect(() => {
    let cleanup = () => {};

    if (supplierWsStore?.initWebSocket) {
      cleanup = supplierWsStore.initWebSocket();
    }

    import('../../../services/websocketService')
      .then((module) => {
        const websocketService = module.default;

        if (!websocketService) {
          console.error('[SUPPLIER_DETAIL] Service WebSocket non trouvé');
          return;
        }

        const effectiveId = currentId || paramId;

        if (!effectiveId) {
          console.log("[SUPPLIER_DETAIL] Pas d'ID de fournisseur, pas d'écouteur WebSocket");
          return;
        }

        console.log(
          `[SUPPLIER_DETAIL] Configuration de l'écouteur WebSocket pour le fournisseur ${effectiveId}`
        );

        // Fonction de gestion des événements de mise à jour
        const handleSupplierUpdate = (payload) => {
          if (payload?.entityId === effectiveId) {
            console.log(
              `[SUPPLIER_DETAIL] Mise à jour WebSocket pour le fournisseur ${effectiveId}, rechargement`
            );
            getSupplierById(effectiveId)
              .then((updatedSupplier) => {
                setSupplier(updatedSupplier);
              })
              .catch((err) => console.error('[SUPPLIER_DETAIL] Erreur lors du rechargement:', err));
          }
        };

        // S'abonner aux événements
        websocketService.on('suppliers.updated', handleSupplierUpdate);

        // S'assurer que nous sommes abonnés au canal suppliers
        websocketService.subscribe('suppliers');
      })
      .catch((err) => {
        console.error("[SUPPLIER_DETAIL] Erreur lors de l'import du service WebSocket:", err);
      });

    // Nettoyage lors du démontage
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [currentId, paramId, getSupplierById, supplierWsStore]);

  // Fetch all data (brands)
  useEffect(() => {
    if (dataFetched) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [brands] = await Promise.all([fetchBrands()]);

        setRelatedData({
          brands: brands?.data || brands || [],
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
  }, [dataFetched, fetchBrands]);

  // Load supplier if not new
  useEffect(() => {
    if (isNew) {
      setSupplier(defaultValues);
      return;
    }

    if (!paramId) return;

    setLoading(true);
    getSupplierById(paramId)
      .then((data) => setSupplier(data))
      .catch((err) => {
        console.error(err);
        setError(`Erreur récupération fournisseur: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [paramId, isNew, getSupplierById]);

  // Utils: option builders
  const toOptions = (items, includeRelations = false) =>
    items.map((i) => ({
      value: i._id,
      label: i.name,
      ...(includeRelations && {
        image: i.image?.src ? imageProxyService.getImageUrl(i.image.src) : null,
      }),
    }));

  const brandOptions = useMemo(() => toOptions(relatedData.brands, true), [relatedData.brands]);

  const specialFields = useMemo(
    () => ({
      brands: { options: brandOptions },
    }),
    [brandOptions]
  );

  // Submission
  const preprocessData = useCallback((data) => {
    const d = { ...data };

    // Nettoyage des champs de base
    d.name = d.name || 'Nouveau fournisseur';
    d.supplier_code = d.supplier_code || '';
    d.customer_code = d.customer_code || '';

    // Gestion des brands
    if (Array.isArray(d.brands)) {
      d.brands = d.brands.filter((brandId) => brandId && brandId.trim() !== '');
    } else {
      d.brands = [];
    }

    // Nettoyage des objets imbriqués
    ['contact', 'banking', 'payment_terms'].forEach((objKey) => {
      if (d[objKey] && typeof d[objKey] === 'object') {
        const objData = {};
        let hasValues = false;

        Object.entries(d[objKey]).forEach(([key, value]) => {
          if (value !== '' && value !== null && value !== undefined) {
            objData[key] =
              key === 'discount' && !isNaN(parseFloat(value)) ? parseFloat(value) : value;
            hasValues = true;
          }
        });

        if (hasValues) {
          d[objKey] = objData;
        } else {
          delete d[objKey];
        }
      }
    });

    console.log('📦 PreprocessData Supplier - Résultat final:', d);
    return d;
  }, []);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const processed = preprocessData(data);

      if (isNew) {
        const created = await createSupplier(processed);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;

        if (!newId) {
          throw new Error('Aucun ID retourné par la création du fournisseur');
        }

        setCurrentId(newId);
        setSuccess('Fournisseur créé');

        const newData = await getSupplierById(newId);
        setSupplier(newData);
        navigate(`/products/suppliers/${newId}`, { replace: true });
      } else {
        await updateSupplier(paramId, processed);
        const updated = await getSupplierById(paramId);
        setSupplier(updated);
        setSuccess('Fournisseur mis à jour');
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
      await deleteSupplier(paramId);
      navigate('/products/suppliers');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${paramId}`);
  };

  // Fonctions d'images
  const handleUploadImage = async (entityId, file) => {
    try {
      setLoading(true);
      await supplierExtras.uploadImage(entityId, file);
      const effectiveId = currentId || paramId;
      const updated = await getSupplierById(effectiveId);
      setSupplier(updated);
      return true;
    } catch (err) {
      console.error("Erreur lors de l'upload d'image:", err);
      setError(`Erreur upload image: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (entityId) => {
    try {
      setLoading(true);
      await supplierExtras.deleteImage(entityId);
      const effectiveId = currentId || paramId;
      const updated = await getSupplierById(effectiveId);
      setSupplier(updated);
      return true;
    } catch (err) {
      console.error("Erreur lors de la suppression d'image:", err);
      setError(`Erreur suppression image: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    supplier,
    loading,
    error,
    success,
    isNew,
    editable: isEditMode,
    currentId: currentId || paramId,
    handleSubmit,
    handleDelete,
    handleCancel,
    validationSchema: getSupplierValidationSchema(isNew),
    defaultValues,
    uploadImage: handleUploadImage,
    deleteImage: handleDeleteImage,
    specialFields,
  };
}

// Valeurs par défaut
const defaultValues = {
  name: '',
  supplier_code: '',
  customer_code: '',
  brands: [],
  contact: { name: '', email: '', phone: '', address: '' },
  banking: { iban: '', bic: '' },
  payment_terms: { type: 'immediate', discount: 0 },
};

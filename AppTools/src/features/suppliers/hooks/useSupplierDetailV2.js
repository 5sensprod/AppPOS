// src/features/suppliers/hooks/useSupplierDetailV2.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSupplierDataStore, useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { useBrand } from '../../brands/stores/brandStore';
import { getSupplierValidationSchema } from '../components/validationSchema/getValidationSchema';
import imageProxyService from '../../../services/imageProxyService';
import supplierConfig from '../config/supplierConfig';
import { useEnrichedConfig, getVisibleTabs } from '../../../utils/configHelpers';

/**
 * Hook V2 pour les détails de fournisseur - Version config-driven optimisée
 */
export default function useSupplierDetailV2() {
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

  // 🔥 NOUVEAU : Initialiser l'écoute WebSocket du store principal
  useEffect(() => {
    const wsStore = useSupplierDataStore.getState();
    let cleanup = () => {};

    if (wsStore.initWebSocket) {
      console.log('🔌 [SUPPLIER_DETAIL_V2] Initialisation WebSocket store principal');
      cleanup = wsStore.initWebSocket();
    }

    return cleanup;
  }, []);

  // WebSocket init spécifique au détail (même logique que V1)
  useEffect(() => {
    let cleanup = () => {};

    if (supplierWsStore?.initWebSocket) {
      cleanup = supplierWsStore.initWebSocket();
    }

    import('../../../services/websocketService')
      .then((module) => {
        const websocketService = module.default;
        if (!websocketService) {
          console.error('[SUPPLIER_DETAIL_V2] Service WebSocket non trouvé');
          return;
        }

        const effectiveId = currentId || paramId;
        if (!effectiveId) {
          console.log("[SUPPLIER_DETAIL_V2] Pas d'ID de fournisseur, pas d'écouteur WebSocket");
          return;
        }

        console.log(`[SUPPLIER_DETAIL_V2] Configuration WebSocket pour fournisseur ${effectiveId}`);

        const handleSupplierUpdate = (payload) => {
          if (payload?.entityId === effectiveId) {
            console.log(`[SUPPLIER_DETAIL_V2] Mise à jour WebSocket pour ${effectiveId}`);

            // 🔥 NOUVEAU : Chercher d'abord dans le cache mis à jour
            const wsStore = useSupplierDataStore.getState();
            const updatedFromCache = wsStore.suppliers?.find((s) => s._id === effectiveId);

            if (updatedFromCache) {
              console.log('✅ Supplier mis à jour depuis le cache WebSocket');
              setSupplier(updatedFromCache);
            } else {
              // Fallback : charger depuis l'API
              getSupplierById(effectiveId)
                .then((updatedSupplier) => {
                  setSupplier(updatedSupplier);
                })
                .catch((err) => console.error('[SUPPLIER_DETAIL_V2] Erreur rechargement:', err));
            }
          }
        };

        websocketService.on('suppliers.updated', handleSupplierUpdate);
        websocketService.subscribe('suppliers');
      })
      .catch((err) => {
        console.error('[SUPPLIER_DETAIL_V2] Erreur import WebSocket:', err);
      });

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [currentId, paramId, getSupplierById, supplierWsStore]);

  // Fetch des données liées (même logique que V1)
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

  // 🔥 OPTIMISÉ : Load supplier avec cache first
  useEffect(() => {
    if (isNew) {
      console.log('🆕 Mode création - utilisation des valeurs par défaut');
      setSupplier(supplierConfig.defaultValues);
      return;
    }

    if (!paramId) return;

    // 🔥 NOUVEAU : Chercher d'abord dans le cache
    const wsStore = useSupplierDataStore.getState();
    const cachedSupplier = wsStore.suppliers?.find((s) => s._id === paramId);

    if (cachedSupplier) {
      console.log('✅ Supplier trouvé dans le cache:', cachedSupplier.name);
      setSupplier(cachedSupplier);
      setLoading(false); // Importante : arrêter le loading
      return;
    }

    // Sinon charger depuis l'API
    console.log('🔄 Supplier non trouvé dans le cache, chargement API...');
    setLoading(true);
    getSupplierById(paramId)
      .then((data) => {
        console.log('✅ Supplier chargé depuis API:', data.name);
        setSupplier(data);
      })
      .catch((err) => {
        console.error('❌ Erreur chargement supplier:', err);
        setError(`Erreur récupération fournisseur: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [paramId, isNew, getSupplierById]);

  // 🔥 NOUVEAU : Écouter les changements du cache WebSocket
  useEffect(() => {
    if (!paramId || isNew) return;

    const wsStore = useSupplierDataStore.getState();

    // Fonction pour synchroniser avec le cache
    const syncWithCache = () => {
      const updatedSupplier = wsStore.suppliers?.find((s) => s._id === paramId);
      if (updatedSupplier && updatedSupplier !== supplier) {
        console.log('🔄 Synchronisation avec cache WebSocket');
        setSupplier(updatedSupplier);
      }
    };

    // Vérifier périodiquement si le cache a été mis à jour
    const interval = setInterval(syncWithCache, 1000);

    return () => clearInterval(interval);
  }, [paramId, isNew, supplier]);

  // NOUVELLE LOGIQUE : Configuration enrichie avec options dynamiques
  const enrichedConfig = useMemo(() => {
    // 🔥 SÉCURISÉ : Vérifier que imageProxyService est disponible et initialisé
    const safeImageFormatter = (() => {
      try {
        // Vérifier que le service existe et est initialisé
        if (!imageProxyService || !imageProxyService.apiBaseUrl) {
          console.log('⏳ imageProxyService pas encore initialisé');
          return null;
        }
        // Tester l'appel pour être sûr
        imageProxyService.getImageUrl('test');
        return imageProxyService.getImageUrl.bind(imageProxyService);
      } catch (error) {
        console.warn('⚠️ imageProxyService non fonctionnel:', error);
        return null;
      }
    })();

    return useEnrichedConfig(supplierConfig, {
      brands: relatedData.brands,
      imageUrlFormatter: safeImageFormatter,
    });
  }, [relatedData.brands]);

  // NOUVELLE LOGIQUE : Tabs visibles selon le mode
  const visibleTabs = useMemo(() => {
    return getVisibleTabs(enrichedConfig, isNew);
  }, [enrichedConfig, isNew]);

  // Preprocessing des données (même logique que V1)
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

    console.log('📦 PreprocessData Supplier V2 - Résultat final:', d);
    return d;
  }, []);

  // Submit handler (même logique que V1)
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

        // 🔥 OPTIMISÉ : Chercher dans le cache d'abord
        const wsStore = useSupplierDataStore.getState();
        const newSupplierFromCache = wsStore.suppliers?.find((s) => s._id === newId);

        if (newSupplierFromCache) {
          setSupplier(newSupplierFromCache);
        } else {
          const newData = await getSupplierById(newId);
          setSupplier(newData);
        }

        navigate(`/products/suppliers/${newId}`, { replace: true });
      } else {
        await updateSupplier(paramId, processed);

        // 🔥 OPTIMISÉ : Chercher dans le cache d'abord
        const wsStore = useSupplierDataStore.getState();
        const updatedFromCache = wsStore.suppliers?.find((s) => s._id === paramId);

        if (updatedFromCache) {
          setSupplier(updatedFromCache);
        } else {
          const updated = await getSupplierById(paramId);
          setSupplier(updated);
        }

        setSuccess('Fournisseur mis à jour');
      }
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Delete handler (même logique que V1)
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

  // Cancel handler (même logique que V1)
  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${paramId}`);
  };

  // Image handlers (même logique que V1 mais optimisés)
  const handleUploadImage = async (entityId, file) => {
    try {
      setLoading(true);
      await supplierExtras.uploadImage(entityId, file);

      // 🔥 OPTIMISÉ : Chercher dans le cache d'abord
      const effectiveId = currentId || paramId;
      const wsStore = useSupplierDataStore.getState();
      const updatedFromCache = wsStore.suppliers?.find((s) => s._id === effectiveId);

      if (updatedFromCache) {
        setSupplier(updatedFromCache);
      } else {
        const updated = await getSupplierById(effectiveId);
        setSupplier(updated);
      }

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

      // 🔥 OPTIMISÉ : Chercher dans le cache d'abord
      const effectiveId = currentId || paramId;
      const wsStore = useSupplierDataStore.getState();
      const updatedFromCache = wsStore.suppliers?.find((s) => s._id === effectiveId);

      if (updatedFromCache) {
        setSupplier(updatedFromCache);
      } else {
        const updated = await getSupplierById(effectiveId);
        setSupplier(updated);
      }

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
    // Données
    supplier,
    loading,
    error,
    success,
    isNew,
    editable: isEditMode,
    currentId: currentId || paramId,

    // NOUVELLE LOGIQUE : Configuration enrichie
    config: enrichedConfig,
    visibleTabs,

    // Handlers (mêmes que V1)
    handleSubmit,
    handleDelete,
    handleCancel,
    uploadImage: handleUploadImage,
    deleteImage: handleDeleteImage,

    // Validation (même que V1)
    validationSchema: getSupplierValidationSchema(isNew),

    // Valeurs par défaut depuis la config
    defaultValues: enrichedConfig.defaultValues,
  };
}

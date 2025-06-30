// src/features/brands/hooks/useBrandDetail.js
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand, useBrandExtras } from '../stores/brandStore';
import { useBrandDataStore } from '../stores/brandStore';
import { useSupplier } from '../../suppliers/stores/supplierStore';
import getValidationSchema from '../components/validationSchema/getValidationSchema';
import apiService from '../../../services/api';
import { useActionToasts } from '../../../components/common/EntityTable/components/BatchActions/hooks/useActionToasts';

export default function useBrandDetail(id, isNew) {
  const navigate = useNavigate();

  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [specialFields, setSpecialFields] = useState({
    suppliers: { options: [] },
  });

  const { getBrandById, createBrand, updateBrand, deleteBrand } = useBrand();
  const { uploadImage, deleteImage, syncBrand } = useBrandExtras();
  const brandWsStore = useBrandDataStore();
  const supplierStore = useSupplier();

  const { toastActions } = useActionToasts();

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await supplierStore.fetchSuppliers();
        const data = res || []; // ✅ correction ici
        console.log('[SUPPLIERS LOADED]', data);
        const supplierOptions = data.map((s) => ({
          value: s._id || s.id,
          label: s.name,
          image: s.image ? { src: s.image.src } : null,
        }));

        setSpecialFields((prev) => ({
          ...prev,
          supplier_id: { options: supplierOptions },
          suppliers: { options: supplierOptions },
        }));
      } catch (err) {
        console.error('Erreur chargement fournisseurs:', err);
      }
    };

    loadSuppliers();
  }, []);

  useEffect(() => {
    if (isNew) {
      setBrand({ name: '', description: '', slug: '', suppliers: [] });
      return;
    }
    if (!id) return;
    let cleanup = () => {};
    if (brandWsStore?.initWebSocket) {
      cleanup = brandWsStore.initWebSocket();
    }
    setLoading(true);
    getBrandById(id)
      .then(setBrand)
      .catch((err) => setError(`Erreur récupération marque: ${err.message}`))
      .finally(() => setLoading(false));
    return cleanup;
  }, [id, isNew, getBrandById, brandWsStore]);

  useEffect(() => {
    if (!id || isNew) return;

    const enrichSuppliersWithImages = async () => {
      try {
        const fetchedBrand = await getBrandById(id);

        const refs = fetchedBrand?.supplier_info?.refs || [];

        const enrichedRefs = await Promise.all(
          refs.map(async (ref) => {
            try {
              const res = await apiService.get(`/api/suppliers/${ref.id}`);
              return {
                ...ref,
                image: res.data?.data?.image || null,
              };
            } catch (e) {
              console.warn(`❌ Impossible de charger l'image du fournisseur ${ref.id}`, e);
              return ref;
            }
          })
        );

        setBrand({
          ...fetchedBrand,
          supplier_info: {
            ...fetchedBrand.supplier_info,
            refs: enrichedRefs,
          },
        });
      } catch (error) {
        console.error('Erreur enrichissement des fournisseurs:', error);
      }
    };

    enrichSuppliersWithImages();
  }, [id, isNew]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const { suppliers = [], ...fields } = data;
      const payload = {
        name: fields.name || '',
        description: fields.description || null,
        slug: fields.slug || null,
        suppliers: suppliers, // ← tableau d’IDs
      };
      if (isNew) {
        const created = await createBrand(payload);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;
        if (newId) {
          setSuccess('Marque créée avec succès');
          navigate(`/products/brands/${newId}`, { replace: true });
        } else {
          throw new Error("Impossible de récupérer l'ID de la nouvelle marque.");
        }
      } else {
        await updateBrand(id, payload);
        const updated = await getBrandById(id);
        setBrand(updated);
        setSuccess('Marque mise à jour');
      }
    } catch (err) {
      console.error(err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (brandId) => {
    try {
      setLoading(true);

      const response = await apiService.delete(`/api/brands/${brandId}`);

      toastActions.deletion.success(1, 'Marque');
      navigate('/products/brands');

      return { success: true, dependency: false };
    } catch (err) {
      console.error('Erreur suppression:', err);

      const isDependendencyError =
        err.response?.status === 400 && err.response?.data?.details?.linkedProducts;

      if (isDependendencyError) {
        const errorData = err.response.data;
        const linkedProducts = errorData.details.linkedProducts;
        const productCount = linkedProducts.length;

        // ✅ TOAST ENRICHI AVEC LISTE DES PRODUITS
        const productList = linkedProducts
          .slice(0, 5) // Limiter à 5 produits pour pas surcharger
          .map((p) => `• ${p.name}${p.sku ? ` (${p.sku})` : ''}`)
          .join('\n');

        const moreText = productCount > 5 ? `\n... et ${productCount - 5} autre(s)` : '';

        toastActions.deletion.error(
          `${errorData.error}\n\nProduits concernés :\n${productList}${moreText}`,
          'marque'
        );

        return { success: false, dependency: true, data: errorData };
      }

      // Autres erreurs
      const errorMessage = err.response?.data?.error || err.message || 'Erreur inconnue';
      setError(`Erreur suppression: ${errorMessage}`);
      toastActions.deletion.error(errorMessage, 'marque');

      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isNew ? '/products/brands' : `/products/brands/${id}`);
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      await syncBrand(id);
      const updated = await getBrandById(id);
      setBrand(updated);
      setSuccess('Marque synchronisée');
    } catch (err) {
      console.error('Erreur sync:', err);
      setError('Erreur synchronisation');
    } finally {
      setLoading(false);
    }
  };

  return {
    brand,
    loading,
    error,
    success,
    specialFields,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    validationSchema: getValidationSchema(isNew),
    defaultValues: {
      name: '',
      description: '',
      slug: '',
      suppliers: [],
    },
    uploadImage,
    deleteImage,
  };
}

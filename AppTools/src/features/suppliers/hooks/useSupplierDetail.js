// src/features/suppliers/hooks/useSupplierDetail.js - VERSION CORRIGÉE
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { useSupplierDataStore } from '../stores/supplierStore';
import { useBrand } from '../../brands/stores/brandStore';
import { getSupplierValidationSchema } from '../components/validationSchema/getValidationSchema';
import imageProxyService from '../../../services/imageProxyService';

export default function useSupplierDetail(id, isNew) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [brandsLoaded, setBrandsLoaded] = useState(false);
  const [specialFields, setSpecialFields] = useState({ brands: { options: [] } });
  const [isDeleted, setIsDeleted] = useState(false); // AJOUT: État pour tracking de suppression

  const { getSupplierById, deleteSupplier, updateSupplier, createSupplier } = useSupplier();
  const { uploadImage, deleteImage, addBrandToSupplier, removeBrandFromSupplier } =
    useSupplierExtras();
  const supplierWsStore = useSupplierDataStore();
  const { fetchBrands } = useBrand();

  useEffect(() => {
    if (!brandsLoaded) {
      fetchBrands().then((res) => {
        const options = (res?.data || []).map((b) => ({
          value: b._id || b.id,
          label: b.name,
          image: b.image?.src ? imageProxyService.getImageUrl(b.image.src) : null,
        }));
        setSpecialFields({ brands: { options } });
        setBrandsLoaded(true);
      });
    }
  }, [brandsLoaded, fetchBrands]);

  const validationSchema = getSupplierValidationSchema(isNew);
  const defaultValues = {
    name: '',
    supplier_code: '',
    customer_code: '',
    brands: [],
    contact: { name: '', email: '', phone: '', address: '' },
    banking: { iban: '', bic: '' },
    payment_terms: { type: 'immediate', discount: 0 },
  };

  useEffect(() => {
    if (isNew) {
      setSupplier(defaultValues);
      return;
    }

    // CORRECTION: Ne pas récupérer si l'entité a été supprimée
    if (!id || isDeleted) return;

    let cleanup = () => {};

    if (supplierWsStore?.initWebSocket) {
      cleanup = supplierWsStore.initWebSocket();
    }

    setLoading(true);
    getSupplierById(id)
      .then((data) => {
        // CORRECTION: Vérifier si on n'est pas en cours de suppression
        if (!isDeleted) {
          setSupplier({ ...data, brands: Array.isArray(data.brands) ? data.brands : [] });
          setError(null);
        }
      })
      .catch((err) => {
        // CORRECTION: Ne pas afficher l'erreur si c'est parce qu'on a supprimé
        if (!isDeleted) {
          setError(`Erreur lors de la récupération du fournisseur: ${err.message}`);
        }
      })
      .finally(() => {
        if (!isDeleted) {
          setLoading(false);
        }
      });

    return cleanup;
  }, [id, isNew, getSupplierById, supplierWsStore, isDeleted]); // AJOUT: isDeleted dans les dépendances

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formatted = formatSupplierData(data);
      if (isNew) {
        const response = await createSupplier(formatted);
        const newId = response?.id || response?._id || response?.data?.id || response?.data?._id;
        if (newId) {
          setSuccess('Fournisseur créé avec succès');
          navigate(`/products/suppliers/${newId}`, { replace: true });
        } else {
          throw new Error('ID non retrouvé après création');
        }
      } else {
        await updateSupplier(id, formatted);

        // CORRECTION: Ne récupérer les données mises à jour que si pas supprimé
        if (!isDeleted) {
          const updated = await getSupplierById(id);
          setSupplier(updated);
          setSuccess('Fournisseur mis à jour avec succès');
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // CORRECTION: Gérer la suppression proprement
  const handleDelete = async () => {
    try {
      console.log('🗑️ Début suppression fournisseur:', id);
      setLoading(true);
      setIsDeleted(true); // AJOUT: Marquer comme supprimé AVANT la suppression

      await deleteSupplier(id);

      console.log('✅ Fournisseur supprimé avec succès');

      // Navigation immédiate sans tentative de récupération
      navigate('/products/suppliers');
    } catch (err) {
      console.error('❌ Erreur lors de la suppression:', err);
      setIsDeleted(false); // CORRECTION: Remettre à false en cas d'erreur
      setError(`Erreur lors de la suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isNew ? '/products/suppliers' : `/products/suppliers/${id}`);
  };

  // CORRECTION: Protéger les opérations d'image contre les suppressions
  const handleUploadImage = async (entityId, file) => {
    if (isDeleted) {
      console.warn("⚠️ Tentative d'upload sur entité supprimée");
      return;
    }

    try {
      setLoading(true);
      await uploadImage(entityId, file);

      // Ne récupérer que si pas supprimé
      if (!isDeleted) {
        const updated = await getSupplierById(id);
        setSupplier(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (entityId) => {
    if (isDeleted) {
      console.warn("⚠️ Tentative de suppression d'image sur entité supprimée");
      return;
    }

    try {
      setLoading(true);
      await deleteImage(entityId);

      // Ne récupérer que si pas supprimé
      if (!isDeleted) {
        const updated = await getSupplierById(id);
        setSupplier(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    supplier,
    loading,
    error,
    success,
    validationSchema,
    defaultValues,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleUploadImage,
    handleDeleteImage,
    specialFields,
    isDeleted, // EXPOSITION: Pour usage externe si nécessaire
  };
}

// Fonction formatSupplierData inchangée
function formatSupplierData(data) {
  const result = { name: data.name || 'Nouveau fournisseur' };
  const addIfNotEmpty = (obj, key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      obj[key] = value;
    }
  };

  ['supplier_code', 'customer_code'].forEach((key) => {
    addIfNotEmpty(result, key, data[key]);
  });

  if (Array.isArray(data.brands)) {
    result.brands = data.brands;
  } else {
    result.brands = [];
  }

  ['contact', 'banking', 'payment_terms'].forEach((objKey) => {
    if (data[objKey] && typeof data[objKey] === 'object') {
      const objData = {};
      let hasValues = false;

      Object.entries(data[objKey]).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          objData[key] =
            key === 'discount' && !isNaN(parseFloat(value)) ? parseFloat(value) : value;
          hasValues = true;
        }
      });

      if (hasValues) result[objKey] = objData;
    }
  });

  return result;
}

// src/features/suppliers/hooks/useSupplierDetail.js
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSupplier, useSupplierExtras } from '../stores/supplierStore';
import { ENTITY_CONFIG } from '../constants';
import getValidationSchema from '../components/validationSchema/getValidationSchema';
import apiService from '../../../services/api';

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

  // ✅ NOUVEAU : État pour les données relationnelles
  const [relatedData, setRelatedData] = useState({ brands: [] });

  // ✅ NOUVEAU : Fetch des données relationnelles (brands pour le champ brands)
  useEffect(() => {
    if (dataFetched) return;

    const fetchRelatedData = async () => {
      setLoading(true);
      try {
        // Charger les marques pour le champ brands
        const brandsResponse = await apiService.get('/api/brands');

        setRelatedData({
          brands: brandsResponse?.data?.data || [],
        });

        setDataFetched(true);
      } catch (err) {
        setError('Erreur chargement des données liées');
        console.error('Erreur chargement brands pour supplier:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedData();
  }, [dataFetched]);

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

  // ✅ NOUVEAU : Options pour les champs spéciaux avec tri alphabétique
  const toOptions = (items) =>
    items
      .map((item) => ({
        value: item._id,
        label: item.name,
        image: item.image ? { src: item.image } : null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

  const brandOptions = useMemo(() => toOptions(relatedData.brands), [relatedData.brands]);

  // ✅ NOUVEAU : Configuration des champs spéciaux
  const specialFields = useMemo(
    () => ({
      brands: {
        type: 'multiselect',
        options: brandOptions,
      },
    }),
    [brandOptions]
  );

  // Submission
  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      // Assurer que le nom est défini
      if (!data.name || data.name.trim() === '') {
        throw new Error('Le nom du fournisseur est requis');
      }

      // ✅ TRAITEMENT DES BRANDS : S'assurer que c'est un tableau
      const processedData = {
        ...data,
        brands: Array.isArray(data.brands)
          ? data.brands.filter(Boolean)
          : data.brands
            ? [data.brands]
            : [],
      };

      console.log('📦 Données à envoyer (supplier):', processedData);

      if (isNew) {
        const created = await createSupplier(processedData);
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
        await updateSupplier(paramId, processedData);
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
    if (isNew) {
      navigate('/products/suppliers');
    } else {
      navigate(`/products/suppliers/${paramId}`);
    }
  };

  // ✅ FONCTIONS IMAGE CORRIGÉES
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
    validationSchema: getValidationSchema(isNew),
    defaultValues,
    // ✅ NOUVEAU : Exposer les champs spéciaux avec options
    specialFields,
    // Fonctions image
    uploadImage: handleUploadImage,
    deleteImage: handleDeleteImage,
  };
}

const defaultValues = {
  name: '',
  supplier_code: '',
  customer_code: '',
  brands: [], // ✅ Tableau par défaut
  contact: {
    name: '',
    email: '',
    phone: '',
    address: '',
  },
  banking: {
    iban: '',
    bic: '',
  },
  payment_terms: {
    type: '',
    discount: null,
  },
};

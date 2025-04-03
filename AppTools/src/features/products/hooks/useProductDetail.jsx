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
  const { uploadImage, deleteImage, setMainImage } = useProductExtras();

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

  // WebSocket init
  useEffect(() => {
    const cleanup = initWebSocketListeners();
    return cleanup;
  }, [initWebSocketListeners]);

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
  const toOptions = (items) => items.map((i) => ({ value: i._id, label: i.name }));

  const categoryOptions = useMemo(() => {
    const transform = (cats, prefix = '') => {
      return cats.flatMap((cat) => [
        { value: cat._id, label: prefix + cat.name },
        ...(cat.children ? transform(cat.children, prefix + '— ') : []),
      ]);
    };
    return transform(hierarchicalCategories);
  }, [hierarchicalCategories]);

  const brandOptions = useMemo(() => toOptions(relatedData.brands), [relatedData.brands]);
  const supplierOptions = useMemo(() => toOptions(relatedData.suppliers), [relatedData.suppliers]);

  // Submission
  const preprocessData = useCallback(
    (data) => {
      const d = { ...data };
      if (!d.category_id) d.category_id = null;
      if (!d.brand_id) d.brand_id = null;
      if (!d.supplier_id) d.supplier_id = null;
      d.description ||= '';
      d.sku ||= '';
      d.stock ||= 0;

      // Relations + catégories imbriquées
      const catRef = categoryOptions.find((c) => c.value === d.category_id);
      d.category_info = {
        refs: d.categories?.map((id) => ({
          id,
          name: categoryOptions.find((c) => c.value === id)?.label || '',
        })),
        primary: d.category_id
          ? {
              id: d.category_id,
              name: catRef?.label || '',
            }
          : null,
      };

      if (d.brand_id) {
        const brand = relatedData.brands.find((b) => b._id === d.brand_id);
        if (brand) d.brand_ref = { id: brand._id, name: brand.name };
      }

      if (d.supplier_id) {
        const sup = relatedData.suppliers.find((s) => s._id === d.supplier_id);
        if (sup) d.supplier_ref = { id: sup._id, name: sup.name };
      }

      return d;
    },
    [categoryOptions, relatedData]
  );

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const processed = preprocessData(data);
      if (isNew) {
        const created = await createProduct(processed);
        const newId = created?.id || created?._id || created?.data?.id || created?.data?._id;
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
      setError(err.message);
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
    uploadImage,
    deleteImage,
    setMainImage,
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
};

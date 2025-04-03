// src/features/products/hooks/useProductDetail.js
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useProduct, useProductExtras } from '../stores/productStore';
import { useHierarchicalCategories } from '../../categories/stores/categoryHierarchyStore';
import { ENTITY_CONFIG } from '../constants';
import getValidationSchema from '../components/validationSchema/getValidationSchema';
import apiService from '../../../services/api';
import ProductPriceSection from '../components/ProductPriceSection';
import GeneralInfoTab from '../../../components/common/tabs/GeneralInfoTab';
import InventoryTab from '../components/tabs/InventoryTab';
import ImagesTab from '../../../components/common/tabs/ImagesTab';
import WooCommerceTab from '../../../components/common/tabs/WooCommerceTab';

export function useProductDetail() {
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
  const effectiveId = useMemo(() => currentId || paramId, [currentId, paramId]);

  const [relatedData, setRelatedData] = useState({ brands: [], suppliers: [] });
  const [dataFetched, setDataFetched] = useState(false);

  const { getProductById, createProduct, updateProduct, deleteProduct, syncProduct } = useProduct();
  const { uploadImage, deleteImage, setMainImage } = useProductExtras();

  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners: initCategoryWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  const validationSchema = getValidationSchema(isNew);

  const defaultValues = useMemo(
    () => ({
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
    }),
    []
  );

  useEffect(() => {
    const cleanup = initCategoryWebSocketListeners();
    return () => typeof cleanup === 'function' && cleanup();
  }, [initCategoryWebSocketListeners]);

  useEffect(() => {
    if (dataFetched) return;
    const fetchAllData = async () => {
      try {
        setLoading(true);
        await fetchHierarchicalCategories();
        const [brands, suppliers] = await Promise.all([
          apiService.get('/api/brands'),
          apiService.get('/api/suppliers'),
        ]);
        setRelatedData({
          brands: brands.data.data || [],
          suppliers: suppliers.data.data || [],
        });
        setDataFetched(true);
      } catch (err) {
        console.error('Erreur fetch form data:', err);
        setError('Erreur lors de la récupération des données');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [dataFetched, fetchHierarchicalCategories]);

  useEffect(() => {
    if (isNew) return setProduct(defaultValues);
    if (!effectiveId) return;
    setLoading(true);
    getProductById(effectiveId)
      .then((data) => setProduct(data))
      .catch((err) => setError(`Erreur: ${err.message}`))
      .finally(() => setLoading(false));
  }, [effectiveId, isNew, getProductById, defaultValues]);

  const transformCategoryOptions = useCallback((categories, prefix = '') => {
    if (!Array.isArray(categories)) return [];
    let options = [];
    categories.forEach((cat) => {
      options.push({ value: cat._id, label: prefix + cat.name });
      if (cat.children?.length) {
        options.push(...transformCategoryOptions(cat.children, prefix + '— '));
      }
    });
    return options;
  }, []);

  const categoryOptions = useMemo(
    () => transformCategoryOptions(hierarchicalCategories),
    [hierarchicalCategories, transformCategoryOptions]
  );

  const brandOptions = useMemo(
    () => relatedData.brands.map((b) => ({ value: b._id, label: b.name })),
    [relatedData.brands]
  );

  const supplierOptions = useMemo(
    () => relatedData.suppliers.map((s) => ({ value: s._id, label: s.name })),
    [relatedData.suppliers]
  );

  const enhancedInventoryFields = useMemo(
    () => ({
      category_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucune catégorie' }, ...categoryOptions],
      },
      categories: { type: 'multiselect', options: categoryOptions },
      brand_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucune marque' }, ...brandOptions],
      },
      supplier_id: {
        type: 'select',
        options: [{ value: '', label: 'Aucun fournisseur' }, ...supplierOptions],
      },
    }),
    [categoryOptions, brandOptions, supplierOptions]
  );

  const handleSubmit = async (data) => {
    /* logique de soumission ici, identique à avant */
  };

  const renderTabContent = (entity, activeTab, formProps = {}) => {
    const { editable, register, control, errors } = formProps;
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
            control={control}
            errors={errors}
            specialFields={editable ? enhancedInventoryFields : {}}
            hierarchicalCategories={hierarchicalCategories}
          />
        );
      case 'images':
        return (
          <ImagesTab
            entity={entity}
            entityId={effectiveId}
            entityType="product"
            galleryMode={true}
            onUploadImage={uploadImage}
            onDeleteImage={deleteImage}
            onSetMainImage={setMainImage}
            isLoading={loading}
            error={error}
          />
        );
      case 'woocommerce':
        return <WooCommerceTab entity={entity} entityType="product" onSync={syncProduct} />;
      default:
        return null;
    }
  };

  return {
    product,
    renderTabContent,
    visibleTabs: isNew
      ? ENTITY_CONFIG.tabs.filter((tab) => !['images', 'woocommerce'].includes(tab.id))
      : ENTITY_CONFIG.tabs,
    defaultValues,
    handleDelete: async () => {
      await deleteProduct(effectiveId);
      navigate('/products');
    },
    handleSubmit,
    handleCancel: () => navigate(isNew ? '/products' : `/products/${effectiveId}`),
    handleSync: async () => await syncProduct(effectiveId),
    loading: loading || hierarchyLoading,
    success,
    error,
    editable: isEditMode,
    validationSchema,
  };
}

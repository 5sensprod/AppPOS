import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import {
  getValidationSchema,
  defaultValues,
  transformToOptions,
  formatCategoryData,
  extractCategoryId,
} from '../services/categoryService';

export function useCategoryDetail() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [wsInitialized, setWsInitialized] = useState(false);

  const { getCategoryById, createCategory, updateCategory, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  // Initialisation WebSocket
  useEffect(() => {
    if (!wsInitialized) {
      const cleanup = initWebSocketListeners();
      setWsInitialized(true);
      return cleanup;
    }
  }, [initWebSocketListeners, wsInitialized]);

  // Chargement de la catégorie
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await fetchHierarchicalCategories();

        if (isNew) {
          setCategory(defaultValues);
          return;
        }

        const effectiveId = currentId || paramId;
        if (!effectiveId) return;

        const data = await getCategoryById(effectiveId);
        setCategory(data);
      } catch (err) {
        console.error('Erreur de chargement de la catégorie:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [paramId, isNew, currentId, getCategoryById, fetchHierarchicalCategories]);

  const parentOptions = useMemo(() => {
    return transformToOptions(hierarchicalCategories, currentId || paramId, isNew);
  }, [hierarchicalCategories, currentId, paramId, isNew]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formatted = formatCategoryData(data);

      if (isNew) {
        const created = await createCategory(formatted);
        const newId = extractCategoryId(created);
        setCurrentId(newId);
        setSuccess('Catégorie créée avec succès');
        const newCategory = await getCategoryById(newId);
        setCategory(newCategory);
        navigate(`/products/categories/${newId}`, { replace: true });
      } else {
        const effectiveId = currentId || paramId;
        await updateCategory(effectiveId, formatted);
        const updated = await getCategoryById(effectiveId);
        setCategory(updated);
        setSuccess('Catégorie mise à jour avec succès');
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
      const effectiveId = currentId || paramId;
      await deleteCategory(effectiveId);
      navigate('/products/categories');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(isNew ? '/products/categories' : `/products/categories/${currentId || paramId}`);
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const effectiveId = currentId || paramId;
      await syncCategory(effectiveId);
      const updated = await getCategoryById(effectiveId);
      setCategory(updated);
      setSuccess('Catégorie synchronisée avec succès');
    } catch (error) {
      setError('Erreur lors de la synchronisation de la catégorie');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (entityId, imageFile) => {
    try {
      await uploadImage(entityId, imageFile);
      const updated = await getCategoryById(entityId);
      setCategory(updated);
    } catch (err) {
      setError(`Erreur upload image: ${err.message}`);
    }
  };

  const handleDeleteImage = async (entityId) => {
    try {
      await deleteImage(entityId);
      const updated = await getCategoryById(entityId);
      setCategory(updated);
    } catch (err) {
      setError(`Erreur suppression image: ${err.message}`);
    }
  };

  const validationSchema = useMemo(() => getValidationSchema(), []);

  return {
    category,
    loading: loading || hierarchyLoading,
    error,
    success,
    editable: isEditMode,
    isNew,
    parentOptions,
    currentId: currentId || paramId,
    validationSchema,
    defaultValues,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
  };
}

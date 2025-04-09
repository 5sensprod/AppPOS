// src/features/categories/hooks/useCategoryDetail.js
import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCategory, useCategoryExtras } from '../stores/categoryStore';
import { useHierarchicalCategories } from '../stores/categoryHierarchyStore';
import {
  getValidationSchema,
  defaultValues,
  transformToOptions,
  formatCategoryData,
  extractCategoryId,
} from '../services/categoryService';

export default function useCategoryDetail() {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isNew = location.pathname.endsWith('/new');
  const isEditMode = isNew || location.pathname.endsWith('/edit');

  const [category, setCategory] = useState(null);
  const [currentId, setCurrentId] = useState(paramId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [wsInitialized, setWsInitialized] = useState(false);

  const { getCategoryById, createCategory, updateCategory, deleteCategory } = useCategory();
  const { uploadImage, deleteImage, syncCategory } = useCategoryExtras();

  const {
    hierarchicalCategories,
    fetchHierarchicalCategories,
    initWebSocketListeners,
    loading: hierarchyLoading,
  } = useHierarchicalCategories();

  useEffect(() => {
    if (!wsInitialized) {
      const cleanup = initWebSocketListeners();
      setWsInitialized(true);
      return () => typeof cleanup === 'function' && cleanup();
    }
  }, [initWebSocketListeners, wsInitialized]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchHierarchicalCategories();

        if (isNew) {
          setCategory(defaultValues);
          return;
        }

        const id = currentId || paramId;
        if (!id) return;

        // Chercher dans la hiérarchie
        const findCategoryById = (categories, id) => {
          for (const cat of categories || []) {
            if (cat._id === id) return cat;
            const found = findCategoryById(cat.children, id);
            if (found) return found;
          }
          return null;
        };

        const hierarchyCategory = findCategoryById(hierarchicalCategories, id);
        if (hierarchyCategory) {
          setCategory(hierarchyCategory);
        } else {
          // Fallback au getCategoryById normal
          const data = await getCategoryById(id);
          setCategory(data);
        }

        setError(null);
      } catch (err) {
        console.error('Erreur chargement catégorie:', err);
        setError(`Erreur: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [paramId, currentId, isNew, fetchHierarchicalCategories, getCategoryById]);

  const parentCategories = useMemo(() => {
    const id = currentId || paramId;
    return transformToOptions(hierarchicalCategories, id, isNew);
  }, [hierarchicalCategories, currentId, paramId, isNew]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      const formatted = formatCategoryData(data);

      if (isNew) {
        const created = await createCategory(formatted);
        const newId = extractCategoryId(created);
        if (!newId) throw new Error("Impossible d'obtenir l'ID de la nouvelle catégorie");
        setCurrentId(newId);
        setSuccess('Catégorie créée avec succès');
        const newData = await getCategoryById(newId);
        setCategory(newData);
        navigate(`/products/categories/${newId}`, { replace: true });
      } else {
        const id = currentId || paramId;
        await updateCategory(id, formatted);
        setSuccess('Catégorie mise à jour');
        const updated = await getCategoryById(id);
        setCategory(updated);
      }
    } catch (err) {
      console.error('Erreur submit:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteCategory(currentId || paramId);
      navigate('/products/categories');
    } catch (err) {
      setError(`Erreur suppression: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isNew) {
      navigate('/products/categories');
    } else {
      navigate(`/products/categories/${currentId || paramId}`);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const id = currentId || paramId;
      await syncCategory(id);
      const updated = await getCategoryById(id);
      setCategory(updated);
      setSuccess('Catégorie synchronisée avec succès');
    } catch (err) {
      console.error(err);
      setError('Erreur synchronisation');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadImage = async (entityId, file) => {
    try {
      await uploadImage(entityId, file);
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

  return {
    category,
    parentCategories,
    isNew,
    editable: isEditMode,
    loading: loading || hierarchyLoading,
    error,
    success,
    currentId: currentId || paramId,
    handleSubmit,
    handleDelete,
    handleCancel,
    handleSync,
    handleUploadImage,
    handleDeleteImage,
    validationSchema: getValidationSchema(),
    defaultValues,
    hierarchicalCategories,
  };
}

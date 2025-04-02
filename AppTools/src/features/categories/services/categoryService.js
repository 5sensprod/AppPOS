// src/features/categories/services/categoryService.js
import * as yup from 'yup';

export const getValidationSchema = () =>
  yup.object().shape({
    name: yup.string().required('Le nom est requis'),
    description: yup.string(),
    parent_id: yup.string().nullable(),
    status: yup.string().required('Le statut est requis'),
    is_featured: yup.boolean(),
    meta_title: yup.string(),
    meta_description: yup.string(),
    meta_keywords: yup.string(),
  });

export const defaultValues = {
  name: '',
  description: '',
  parent_id: '',
  status: 'draft',
  is_featured: false,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
};

// Transformation récursive pour les options du select hiérarchique
export const transformToOptions = (categories, currentId, isNew, prefix = '') => {
  if (!Array.isArray(categories)) {
    console.warn("transformToOptions: categories n'est pas un tableau", categories);
    return [];
  }

  let options = [];

  categories.forEach((category) => {
    if (!category || typeof category !== 'object') return;

    if (!isNew && category._id === currentId) return;

    options.push({
      value: category._id,
      label: prefix + (category.name || 'Sans nom'),
    });

    if (Array.isArray(category.children) && category.children.length > 0) {
      options = [
        ...options,
        ...transformToOptions(category.children, currentId, isNew, prefix + '— '),
      ];
    }
  });

  return options;
};

// Formattage des données pour API (création / mise à jour)
export const formatCategoryData = (data) => {
  const formattedData = { ...data };

  Object.keys(formattedData).forEach((field) => {
    const value = formattedData[field];

    switch (field) {
      case 'parent_id':
        if (value === '') formattedData[field] = null;
        break;

      case 'woo_id':
      case 'last_sync':
      case 'createdAt':
      case 'updatedAt':
      case 'pending_sync':
      case '_id':
      case '__v':
      case 'created_at':
      case 'updated_at':
      case 'level':
      case 'product_count':
      case 'gallery_images':
        delete formattedData[field];
        break;

      default:
        if (value === '') {
          delete formattedData[field];
        }
        break;
    }
  });

  return formattedData;
};

// Récupération de l'ID après création
export const extractCategoryId = (created) => {
  return (
    created?.id ||
    created?._id ||
    created?.data?.id ||
    created?.data?._id ||
    (typeof created === 'string' ? created : null)
  );
};

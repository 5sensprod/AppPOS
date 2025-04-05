// src/features/brands/components/validationSchema/getValidationSchema.jsx
import * as yup from 'yup';

const getValidationSchema = (isNew = true) => {
  return yup.object().shape({
    name: yup
      .string()
      .required('Le nom de la marque est requis')
      .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
    slug: yup.string().nullable(),
    suppliers: yup.array().of(yup.string()).nullable().default([]),
    description: yup
      .string()
      .max(1000, 'La description ne doit pas dépasser 1000 caractères')
      .nullable(),
  });
};

export default getValidationSchema;

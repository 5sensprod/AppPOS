// src/features/brands/components/validationSchema/getValidationSchema.jsx
import * as yup from 'yup';

const getValidationSchema = (isNew = true) => {
  return yup.object().shape({
    name: yup
      .string()
      .required('Le nom de la marque est requis')
      .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
    slug: yup.string().nullable(),
    // ✅ CORRECTION: Transformer les valeurs string en tableau
    suppliers: yup
      .mixed()
      .transform((value, originalValue) => {
        console.log('🔍 Transform suppliers - originalValue:', originalValue, 'value:', value);

        // Si c'est déjà un tableau, le retourner tel quel
        if (Array.isArray(value)) {
          return value.filter(Boolean); // Nettoyer les valeurs vides
        }

        // Si c'est une chaîne de caractères (ID unique), la transformer en tableau
        if (typeof value === 'string' && value.trim() !== '') {
          return [value];
        }

        // Valeur par défaut : tableau vide
        return [];
      })
      .default([]),
    description: yup
      .string()
      .max(1000, 'La description ne doit pas dépasser 1000 caractères')
      .nullable(),
  });
};

export default getValidationSchema;

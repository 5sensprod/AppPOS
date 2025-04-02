import * as yup from 'yup';

// Fonction pour obtenir le schéma de validation en fonction du mode
export const getValidationSchema = (isNew = true) => {
  // Schéma pour la création (validation complète)
  if (isNew) {
    return yup.object().shape({
      // Champs principaux
      name: yup.string().required('Le nom est requis'),
      sku: yup
        .string()
        .transform((value) => (value === null || value === undefined ? '' : value))
        .default(''),
      description: yup
        .string()
        .transform((value) => (value === null || value === undefined ? '' : value))
        .default(''),
      status: yup.string().default('draft'),

      // Prix
      price: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined
            ? null
            : value
        )
        .nullable()
        .required('Le prix est requis')
        .typeError('Le prix doit être un nombre'),
      regular_price: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined
            ? null
            : value
        )
        .nullable()
        .typeError('Le prix régulier doit être un nombre'),
      sale_price: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined
            ? null
            : value
        )
        .nullable()
        .typeError('Le prix promotionnel doit être un nombre'),
      purchase_price: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined
            ? null
            : value
        )
        .nullable()
        .typeError("Le prix d'achat doit être un nombre"),

      // Stock
      stock: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
        )
        .default(0)
        .typeError('Le stock doit être un nombre'),
      min_stock: yup
        .number()
        .transform((value, originalValue) =>
          originalValue === '' || originalValue === null || originalValue === undefined
            ? null
            : value
        )
        .nullable()
        .typeError('Le stock minimum doit être un nombre'),
      manage_stock: yup.boolean().default(false),

      // Relations (IDs et références)
      category_id: yup
        .string()
        .nullable()
        .transform((value) => (value === '' ? null : value)),
      categories: yup.array().of(yup.string().nullable()).default([]),
      brand_id: yup
        .string()
        .nullable()
        .transform((value) => (value === '' ? null : value)),
      supplier_id: yup
        .string()
        .nullable()
        .transform((value) => (value === '' ? null : value)),

      // Nouveaux champs de référence
      brand_ref: yup.object().nullable(),
      supplier_ref: yup.object().nullable(),
    });
  }

  // Schéma pour l'édition (tous les champs optionnels)
  return yup.object().shape({
    // Champs principaux
    name: yup.string().optional(),
    sku: yup
      .string()
      .transform((value) => (value === null || value === undefined ? '' : value))
      .optional(),
    description: yup
      .string()
      .transform((value) => (value === null || value === undefined ? '' : value))
      .optional(),
    status: yup.string().optional(),

    // Prix
    price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .optional()
      .typeError('Le prix doit être un nombre'),
    regular_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .optional()
      .typeError('Le prix régulier doit être un nombre'),
    sale_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .optional()
      .typeError('Le prix promotionnel doit être un nombre'),
    purchase_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .optional()
      .typeError("Le prix d'achat doit être un nombre"),

    // Stock
    stock: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? 0 : value
      )
      .optional()
      .typeError('Le stock doit être un nombre'),
    min_stock: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .optional()
      .typeError('Le stock minimum doit être un nombre'),
    manage_stock: yup.boolean().optional(),

    // Relations (IDs et références)
    category_id: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .optional(),
    categories: yup.array().of(yup.string().nullable()).optional(),
    brand_id: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .optional(),
    supplier_id: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value))
      .optional(),

    brand_ref: yup.object().nullable().optional(),
    supplier_ref: yup.object().nullable().optional(),
  });
};

export default getValidationSchema;

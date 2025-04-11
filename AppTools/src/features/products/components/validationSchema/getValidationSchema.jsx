import * as yup from 'yup';

// Fonction pour obtenir le schéma de validation en fonction du mode
export const getValidationSchema = (isNew = true) => {
  // Structure commune pour les deux schémas
  const commonSchema = {
    // Champs principaux - Modification pour rendre le name optionnel et utiliser designation ou sku
    name: yup.string().transform((value, originalValue) => {
      if (value) return value;

      // Si name n'est pas défini, utiliser designation ou sku
      return originalValue?.designation || originalValue?.sku || '';
    }),
    designation: yup.string().default(''),
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
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .required('Le prix est requis')
      .typeError('Le prix doit être un nombre'),
    regular_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .typeError('Le prix régulier doit être un nombre'),
    sale_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
      )
      .nullable()
      .typeError('Le prix promotionnel doit être un nombre'),
    purchase_price: yup
      .number()
      .transform((value, originalValue) =>
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
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
        originalValue === '' || originalValue === null || originalValue === undefined ? null : value
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

    // Métadonnées
    meta_data: yup.mixed().transform((value, originalValue) => {
      // Si c'est déjà un tableau, on le retourne tel quel
      if (Array.isArray(value)) return value;

      // Si on reçoit un objet avec des propriétés sous forme de champs
      if (value && typeof value === 'object') {
        const metaArray = [];

        // Traiter le champ barcode s'il existe
        if (value.barcode !== undefined) {
          metaArray.push({
            key: 'barcode',
            value: value.barcode,
          });
        }

        // Ajouter d'autres métadonnées ici si nécessaire

        return metaArray;
      }

      // Valeur par défaut
      return [];
    }),
  };

  // Schéma pour la création (validation complète)
  if (isNew) {
    return yup.object().shape(commonSchema);
  }

  // Schéma pour l'édition (tous les champs optionnels)
  return yup.object().shape(
    Object.entries(commonSchema).reduce((schema, [key, value]) => {
      // Pour chaque champ du schéma commun, le rendre optionnel
      schema[key] = value.optional();
      return schema;
    }, {})
  );
};

export default getValidationSchema;

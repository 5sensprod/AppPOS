// src/features/suppliers/components/validationSchema/getValidationSchema.jsx
import * as yup from 'yup';

/**
 * Génère un schéma de validation Yup pour les formulaires de fournisseurs
 * @param {boolean} isNew - Indique si c'est un nouveau fournisseur ou une mise à jour
 * @returns {Object} - Schéma de validation Yup
 */
export const getSupplierValidationSchema = (isNew = false) => {
  // Schéma de base
  const schema = yup.object().shape({
    // Champs principaux
    name: yup.string().required('Le nom du fournisseur est obligatoire'),
    supplier_code: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    customer_code: yup
      .string()
      .nullable()
      .transform((value) => (value === '' ? null : value)),

    // Contact
    contact: yup
      .object()
      .shape({
        name: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
        email: yup
          .string()
          .email("Format d'email invalide")
          .nullable()
          .transform((value) => (value === '' ? null : value)),
        phone: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
        address: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
      })
      .nullable()
      .default({}),

    // Informations bancaires
    banking: yup
      .object()
      .shape({
        iban: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
        bic: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
      })
      .nullable()
      .default({}),

    // Conditions de paiement
    payment_terms: yup
      .object()
      .shape({
        type: yup
          .string()
          .nullable()
          .transform((value) => (value === '' ? null : value)),
        discount: yup
          .number()
          .transform((value) => (isNaN(value) ? null : Number(value)))
          .min(0, 'La remise ne peut pas être négative')
          .max(100, 'La remise ne peut pas dépasser 100%')
          .nullable(),
      })
      .nullable()
      .default({}),
  });

  // En mode création, rendre le nom obligatoire
  if (isNew) {
    return schema;
  }

  // En mode mise à jour, tous les champs sont optionnels
  return schema;
};

export default getSupplierValidationSchema;

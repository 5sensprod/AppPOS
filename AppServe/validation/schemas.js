// validation/schemas.js
const Joi = require('joi');

const imageSchema = Joi.object({
  id: Joi.number(),
  src: Joi.string().uri(),
  local_path: Joi.string(),
  hash: Joi.string(),
  status: Joi.string().valid('pending', 'active', 'deleted'),
  type: Joi.string().valid('jpg', 'jpeg', 'png', 'gif', 'webp'),
  position: Joi.number().min(0),
});

const imageMetadataSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'deleted'),
  type: Joi.string().valid('jpg', 'jpeg', 'png', 'gif', 'webp'),
  position: Joi.number().min(0),
});

// Schéma de création des catégories
const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  parent_id: Joi.string().allow(null, ''),
  slug: Joi.string().allow(''),
  description: Joi.string().allow(''),
  website_url: Joi.string().uri().allow(''),
  image: imageSchema,
  status: Joi.string().valid('published', 'draft').default('draft'),
  is_featured: Joi.boolean().default(false),
  meta_title: Joi.string().allow(''),
  meta_description: Joi.string().allow(''),
  meta_keywords: Joi.string().allow(''),
});

// Schéma de mise à jour des catégories - tous les champs sont optionnels
// On utilise fork pour rendre tous les champs optionnels
const updateCategorySchema = createCategorySchema.fork(
  Object.keys(createCategorySchema.describe().keys),
  (schema) => schema.optional()
);
const createBrandSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().allow('', null),
  description: Joi.string().allow('', null),
  image: imageSchema,
  suppliers: Joi.array().items(Joi.string()).default([]),
  suppliersRefs: Joi.array()
    .items(
      Joi.object({
        id: Joi.string(),
        name: Joi.string(),
      })
    )
    .default([]),
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string(),
      value: Joi.string(),
    })
  ),
});

const updateBrandSchema = createBrandSchema.fork(
  Object.keys(createBrandSchema.describe().keys),
  (schema) => schema.optional()
);

const createSupplierSchema = Joi.object({
  supplier_code: Joi.string().allow(null, ''),
  customer_code: Joi.string().allow(null, ''),
  name: Joi.string().required(),
  brands: Joi.array().items(Joi.string()).default([]),
  brandsRefs: Joi.array()
    .items(
      Joi.object({
        id: Joi.string(),
        name: Joi.string(),
      })
    )
    .default([]),
  contact: Joi.object({
    name: Joi.string().allow(null, ''),
    email: Joi.string().email().allow(null, ''),
    phone: Joi.string().allow(null, ''),
    address: Joi.string().allow(null, ''),
  }).optional(),
  banking: Joi.object({
    iban: Joi.string().allow(null, ''),
    bic: Joi.string().allow(null, ''),
  }).optional(),
  payment_terms: Joi.object({
    type: Joi.string().allow(null, ''),
    discount: Joi.number().allow(null),
  }).optional(),
}).options({
  stripUnknown: true,
  abortEarly: false,
});

// Pour la mise à jour, rendre tous les champs optionnels
const updateSupplierSchema = createSupplierSchema.fork(
  Object.keys(createSupplierSchema.describe().keys),
  (schema) => schema.optional()
);

const createProductSchema = Joi.object({
  // Champs principaux
  name: Joi.string().required(),
  slug: Joi.string().allow(null, ''),
  sku: Joi.string().allow(null, '').default(''),
  description: Joi.string().allow(null, '').default(''),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),

  // Gestion du stock
  manage_stock: Joi.boolean().default(false),
  stock: Joi.number().allow(null).default(0),
  min_stock: Joi.number().allow(null).default(0),

  // Prix
  price: Joi.number().allow(null).required(),
  regular_price: Joi.number().allow(null),
  sale_price: Joi.number().allow(null),
  purchase_price: Joi.number().allow(null),

  // IDs standards (acceptant chaînes vides et null)
  brand_id: Joi.string().allow(null, ''),
  supplier_id: Joi.string().allow(null, ''),
  categories: Joi.array().items(Joi.string().allow(null, '')).default([]),
  category_id: Joi.string().allow(null, ''),

  // Références complètes (objets avec id et name)
  brand_ref: Joi.object({
    id: Joi.string().allow(null, ''),
    name: Joi.string().allow(null, ''),
  }).allow(null),

  supplier_ref: Joi.object({
    id: Joi.string().allow(null, ''),
    name: Joi.string().allow(null, ''),
  }).allow(null),

  // Images
  image: Joi.object().allow(null),
  gallery_images: Joi.array().items(Joi.object()).default([]),

  // Champs additionnels
  designation: Joi.string().allow(null, '').default(''),
  description_short: Joi.string().allow(null, '').default(''),
  margin_rate: Joi.number().allow(null),
  tax_rate: Joi.number().allow(null),

  specifications: Joi.object({
    content: Joi.string().allow(null, ''),
  }).allow(null),

  meta_data: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().allow(null, ''),
        value: Joi.any(),
      })
    )
    .default([]),
}).options({
  stripUnknown: true,
  abortEarly: false,
});

const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys),
  (schema) => schema.optional()
);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createBrandSchema,
  updateBrandSchema,
  createSupplierSchema,
  updateSupplierSchema,
  imageMetadataSchema,
  createProductSchema,
  updateProductSchema,
};

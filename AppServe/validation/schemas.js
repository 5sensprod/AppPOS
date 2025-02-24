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

const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  parent_id: Joi.string(),
  slug: Joi.string(),
  description: Joi.string(),
  website_url: Joi.string().uri(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string(),
  parent_id: Joi.string(),
  slug: Joi.string(),
  description: Joi.string(),
  website_url: Joi.string().uri(),
  image: imageSchema,
});

const createBrandSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string(),
  description: Joi.string(),
  suppliers: Joi.array().items(Joi.string()).default([]), // IDs des fournisseurs
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string(),
      value: Joi.string(),
    })
  ),
  woo_id: Joi.number(),
  last_sync: Joi.date(),
});

const updateBrandSchema = Joi.object({
  name: Joi.string(),
  slug: Joi.string(),
  description: Joi.string(),
  supplier_id: Joi.string(),
  image: imageSchema,
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string(),
      value: Joi.string(),
    })
  ),
});

const createSupplierSchema = Joi.object({
  supplier_code: Joi.string().required(),
  customer_code: Joi.string(),
  name: Joi.string().required(),
  brands: Joi.array().items(Joi.string()).default([]), // IDs des marques
  contact: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    address: Joi.string(),
  }),
  banking: Joi.object({
    iban: Joi.string(),
    bic: Joi.string(),
  }),
  payment_terms: Joi.object({
    type: Joi.string(),
    discount: Joi.number(),
  }),
});

const updateSupplierSchema = Joi.object({
  supplier_code: Joi.string(),
  customer_code: Joi.string(),
  name: Joi.string(),
  contact: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    address: Joi.string(),
  }),
  banking: Joi.object({
    iban: Joi.string(),
    bic: Joi.string(),
  }),
  image: imageSchema,
  payment_terms: Joi.object({
    type: Joi.string(),
    discount: Joi.number(),
  }),
});

const createProductSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().optional(),
  description: Joi.string().allow('', null),
  purchase_price: Joi.number().min(0),
  regular_price: Joi.number().min(0),
  price: Joi.number().min(0).required(),
  sale_price: Joi.number().min(0),
  on_sale: Joi.boolean().default(false),
  margins: Joi.object({
    amount: Joi.number(),
    margin_rate: Joi.number(),
    markup_rate: Joi.number(),
    coefficient: Joi.number(),
  }),
  tax: Joi.object({
    rate: Joi.number(),
    included: Joi.boolean(),
  }),
  stock: Joi.number().min(0).required(),
  min_stock: Joi.number().min(0).default(0),
  category_id: Joi.string().allow(null),
  categories: Joi.array().items(Joi.string()).default([]),
  category_path: Joi.array().items(Joi.string()),
  supplier_id: Joi.string().required(),
  brand_id: Joi.string().required(),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  manage_stock: Joi.boolean().default(true),
  specifications: Joi.object().allow(null),
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string().required(),
      value: Joi.string().required(),
    })
  ),
  website_url: Joi.string().uri().allow('', null),
}).required();

const updateProductSchema = createProductSchema.keys({
  name: Joi.string(),
  sku: Joi.string(),
  price: Joi.number().min(0),
  stock: Joi.number().min(0),
  category_id: Joi.string().allow(null),
  categories: Joi.array().items(Joi.string()).default([]),
  supplier_id: Joi.string(),
  brand_id: Joi.string(),
  woo_id: Joi.number(),
  images: Joi.array().items(imageSchema),
});

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

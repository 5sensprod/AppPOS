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

// Schéma pour les métadonnées d'image
const imageMetadataSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'deleted'),
  type: Joi.string().valid('jpg', 'jpeg', 'png', 'gif', 'webp'),
  position: Joi.number().min(0),
});

// Schéma pour la création d'une catégorie
const createCategorySchema = Joi.object({
  name: Joi.string().required(),
  parent_id: Joi.string(),
  slug: Joi.string(),
  description: Joi.string(),
  website_url: Joi.string().uri(),
});

// Schéma pour la mise à jour d'une catégorie
const updateCategorySchema = Joi.object({
  name: Joi.string(),
  parent_id: Joi.string(),
  slug: Joi.string(),
  description: Joi.string(),
  website_url: Joi.string().uri(),
  image: imageSchema,
});

const productSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().required(),
  description: Joi.string(),
  purchase_price: Joi.number().min(0),
  regular_price: Joi.number().min(0),
  price: Joi.number().min(0).required(),
  sale_price: Joi.number().min(0),
  on_sale: Joi.boolean(),
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
  min_stock: Joi.number().min(0),
  category_id: Joi.string().required(),
  category_path: Joi.array().items(Joi.string()),
  supplier_id: Joi.string().required(),
  brand_id: Joi.string().required(),
  woo_id: Joi.number(),
  status: Joi.string(),
  manage_stock: Joi.boolean(),
  images: Joi.array().items(imageSchema),
  specifications: Joi.object(),
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string(),
      value: Joi.string(),
    })
  ),
  website_url: Joi.string().uri(),
});

const categorySchema = Joi.object({
  name: Joi.string().required(),
  parent_id: Joi.string(),
  level: Joi.number(),
  woo_id: Joi.number(),
  slug: Joi.string(),
  description: Joi.string(),
  image: imageSchema,
  website_url: Joi.string().uri(),
});

const brandSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string(),
  description: Joi.string(),
  supplier_id: Joi.string().required(),
  woo_id: Joi.number(),
  image: imageSchema,
  meta_data: Joi.array().items(
    Joi.object({
      key: Joi.string(),
      value: Joi.string(),
    })
  ),
});

const supplierSchema = Joi.object({
  supplier_code: Joi.string().required(),
  customer_code: Joi.string(),
  name: Joi.string().required(),
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
  brands: Joi.array().items(Joi.string()),
  image: imageSchema,
  payment_terms: Joi.object({
    type: Joi.string(),
    discount: Joi.number(),
  }),
  orders_history: Joi.array().items(
    Joi.object({
      date: Joi.date(),
      amount: Joi.number(),
      status: Joi.string(),
    })
  ),
});

module.exports = {
  productSchema,
  categorySchema,
  brandSchema,
  supplierSchema,
  imageMetadataSchema,
  createCategorySchema,
  updateCategorySchema,
};

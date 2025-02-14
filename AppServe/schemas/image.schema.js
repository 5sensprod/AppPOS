// src/schemas/image.schema.js
const Joi = require('joi');

// Schéma de base pour les métadonnées
const imageMetadataSchema = Joi.object({
  alt: Joi.string(),
  title: Joi.string(),
  size: Joi.number(),
  mimetype: Joi.string(),
  original_name: Joi.string(),
  position: Joi.number().min(0),
  hash: Joi.string(),
});

// Schéma de base pour une image
const baseImageSchema = Joi.object({
  id: Joi.number(),
  wp_id: Joi.number(),
  src: Joi.string().required(),
  local_path: Joi.string().required(),
  status: Joi.string().valid('pending', 'active', 'deleted'),
  type: Joi.string().valid('jpg', 'jpeg', 'png', 'gif', 'webp'),
  metadata: imageMetadataSchema,
});

// Extension pour les images de produits (galerie)
const productImageSchema = baseImageSchema.keys({
  is_primary: Joi.boolean().default(false),
  gallery_order: Joi.number().min(0),
});

// Schéma pour la mise à jour des métadonnées
const updateImageMetadataSchema = Joi.object({
  status: Joi.string().valid('pending', 'active', 'deleted'),
  type: Joi.string().valid('jpg', 'jpeg', 'png', 'gif', 'webp'),
  metadata: imageMetadataSchema,
});

module.exports = {
  baseImageSchema,
  productImageSchema,
  imageMetadataSchema,
  updateImageMetadataSchema,
};

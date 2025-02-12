// controllers/productController.js
const Product = require('../models/Product');
const fs = require('fs').promises;
const path = require('path');

const productController = {
  async getAll(req, res) {
    try {
      const products = await Product.findAll();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Produit non trouvé' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async uploadImage(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: 'No image provided' });

      const imagePath = `/public/products/${req.params.id}/${req.file.filename}`;
      const localPath = path.join('public', imagePath);

      await Product.update(req.params.id, { image: { local_path: localPath, src: imagePath } });

      res.json({ message: 'Image uploaded successfully', src: imagePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const newProduct = await Product.create(req.body);
      res.status(201).json(newProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const updated = await Product.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Produit non trouvé' });
      res.json({ message: 'Produit mis à jour' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await Product.delete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Produit non trouvé' });
      res.json({ message: 'Produit supprimé' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = productController;

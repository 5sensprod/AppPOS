// src/middleware/upload/validators.js
const validateImageUpload = (imageHandler) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    try {
      // Pour les uploads multiples (produits)
      if (req.files) {
        req.files.forEach((file) => imageHandler.validateFile(file));
      }
      // Pour les uploads uniques (catégories, marques)
      else if (req.file) {
        imageHandler.validateFile(req.file);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { validateImageUpload };

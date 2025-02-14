// src/middleware/upload/handlers.js
const multer = require('multer');
const createMulterConfig = require('./config');
const { validateImageUpload } = require('./validators');
const SingleImage = require('../../models/images/SingleImage');

const createImageUploadMiddleware = (entity) => {
  const imageHandler = new SingleImage(entity);
  const multerConfig = createMulterConfig(imageHandler);
  const upload = multer(multerConfig);

  return {
    single: [upload.single('image'), validateImageUpload(imageHandler)],
    array: [upload.array('images', imageHandler.maxFiles), validateImageUpload(imageHandler)],
  };
};

module.exports = createImageUploadMiddleware;

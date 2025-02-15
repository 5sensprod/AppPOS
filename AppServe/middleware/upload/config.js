// src/middleware/upload/config.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class UploadConfig {
  constructor(imageHandler) {
    this.imageHandler = imageHandler;
    this.basePath = process.cwd();
    this.ensureDirectories();
  }

  ensureDirectories() {
    const entityPath = path.join(this.basePath, 'public', this.imageHandler.entity);
    const tempPath = path.join(entityPath, 'temp');

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath, { recursive: true });
    }
  }

  getStorageConfig() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        const tempPath = path.join(this.basePath, 'public', this.imageHandler.entity, 'temp');
        fs.mkdirSync(tempPath, { recursive: true });
        cb(null, tempPath);
      },
      filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueId}${extension}`);
      },
    });
  }

  getMulterConfig() {
    return {
      storage: this.getStorageConfig(),
      limits: {
        fileSize: this.imageHandler.maxSize,
        files: this.imageHandler.maxFiles,
      },
      fileFilter: (req, file, cb) => {
        try {
          this.imageHandler.validateFile(file);
          cb(null, true);
        } catch (error) {
          cb(new Error(error.message));
        }
      },
    };
  }
}

module.exports = (imageHandler) => new UploadConfig(imageHandler).getMulterConfig();

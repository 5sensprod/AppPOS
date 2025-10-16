// AppServer/models/images/PresetImageHandler.js
const BaseImage = require('../base/BaseImage');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class PresetImageHandler extends BaseImage {
  constructor() {
    super('presets');
    this.maxFiles = 10;
    this.imageSubfolder = 'images';

    const pathManager = require('../../utils/PathManager');
    this.uploadPath = path.join(pathManager.getPublicPath('presets'), 'images');

    this.ensureDirectory();
  }

  async ensureDirectory() {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
      console.log(`✅ [PRESET_IMAGES] Dossier créé/vérifié: ${this.uploadPath}`);
    } catch (error) {
      console.error(`❌ [PRESET_IMAGES] Erreur création dossier:`, error);
    }
  }

  /**
   * 🆕 Obtenir l'IP locale du serveur (même logique que webServer.js)
   */
  getServerIp() {
    const interfaces = os.networkInterfaces();

    const blacklistedPatterns = [
      /^100\./,
      /^172\.16\./,
      /^172\.17\./,
      /^172\.18\./,
      /^172\.19\./,
      /^10\.0\.53\./,
      /^192\.168\.56\./,
      /^169\.254\./,
    ];

    const blacklistedNames = [
      'VMware',
      'VirtualBox',
      'Hyper-V',
      'TAP-Windows',
      'OpenVPN',
      'Hamachi',
      'ZeroTier',
      'Tailscale',
      'WireGuard',
      'vEthernet',
      'docker',
      'br-',
      'vboxnet',
      'vmnet',
    ];

    for (const ifaceName in interfaces) {
      const isSuspiciousName = blacklistedNames.some((name) =>
        ifaceName.toLowerCase().includes(name.toLowerCase())
      );

      if (isSuspiciousName) continue;

      for (const iface of interfaces[ifaceName]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const isSuspiciousIp = blacklistedPatterns.some((pattern) => pattern.test(iface.address));

          if (!isSuspiciousIp) {
            return iface.address;
          }
        }
      }
    }

    return 'localhost';
  }

  /**
   * 🔧 FIXED: Retourne une URL complète avec l'IP du serveur
   */
  async uploadImage(file) {
    try {
      await this.ensureDirectory();
      this.validateFile(file);

      const cleanFileName = this.formatFileName(file.originalname);
      const timestamp = Date.now();
      const finalFileName = `${cleanFileName}-${timestamp}${path.extname(file.originalname)}`;
      const finalPath = path.join(this.uploadPath, finalFileName);

      await fs.rename(file.path, finalPath);

      // ✅ Construire l'URL complète avec l'IP du serveur
      const serverIp = this.getServerIp();
      const serverPort = process.env.PORT || 3000;
      const imageUrl = `http://${serverIp}:${serverPort}/public/presets/images/${finalFileName}`;

      const imageData = {
        src: imageUrl, // URL complète
        local_path: finalPath,
        filename: finalFileName,
        type: path.extname(file.originalname).substring(1),
        metadata: {
          original_name: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploaded_at: new Date().toISOString(),
        },
      };

      if (file.dimensions) {
        imageData.dimensions = file.dimensions;
        imageData.width = file.dimensions.width;
        imageData.height = file.dimensions.height;
      }

      console.log(`✅ [PRESET_IMAGES] Image uploadée: ${finalFileName}`);
      console.log(`🔗 [PRESET_IMAGES] URL générée: ${imageUrl}`);
      return imageData;
    } catch (error) {
      if (file?.path) {
        await fs.unlink(file.path).catch(() => {});
      }
      throw new Error(`Erreur upload image preset: ${error.message}`);
    }
  }

  /**
   * 🔧 FIXED: Liste avec URLs complètes
   */
  async listImages() {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.uploadPath);

      const serverIp = this.getServerIp();
      const serverPort = process.env.PORT || 3000;

      const images = [];
      for (const filename of files) {
        const filePath = path.join(this.uploadPath, filename);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && this.isImageFile(filename)) {
          images.push({
            src: `http://${serverIp}:${serverPort}/public/presets/images/${filename}`,
            filename: filename,
            size: stats.size,
            created_at: stats.birthtime,
            modified_at: stats.mtime,
          });
        }
      }

      return images.sort((a, b) => b.created_at - a.created_at);
    } catch (error) {
      console.error('❌ [PRESET_IMAGES] Erreur liste images:', error);
      return [];
    }
  }

  isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  }

  async deleteImage(filename) {
    try {
      const filePath = path.join(this.uploadPath, filename);
      await fs.access(filePath);
      await fs.unlink(filePath);
      console.log(`✅ [PRESET_IMAGES] Image supprimée: ${filename}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.warn(`⚠️ [PRESET_IMAGES] Fichier introuvable: ${filename}`);
        return false;
      }
      throw new Error(`Erreur suppression image: ${error.message}`);
    }
  }

  async cleanupOrphanImages(usedImages = []) {
    try {
      const allImages = await this.listImages();
      const usedFilenames = new Set(
        usedImages.map((img) => {
          if (typeof img === 'string') {
            return path.basename(img);
          }
          return img.filename || path.basename(img.src || '');
        })
      );

      let deletedCount = 0;

      for (const image of allImages) {
        if (!usedFilenames.has(image.filename)) {
          await this.deleteImage(image.filename);
          deletedCount++;
        }
      }

      console.log(`✅ [PRESET_IMAGES] Nettoyage: ${deletedCount} images orphelines supprimées`);
      return { deleted: deletedCount, total: allImages.length };
    } catch (error) {
      console.error('❌ [PRESET_IMAGES] Erreur nettoyage:', error);
      return { deleted: 0, total: 0, error: error.message };
    }
  }

  async getImageInfo(filename) {
    try {
      const filePath = path.join(this.uploadPath, filename);
      const stats = await fs.stat(filePath);

      const serverIp = this.getServerIp();
      const serverPort = process.env.PORT || 3000;

      return {
        src: `http://${serverIp}:${serverPort}/public/presets/images/${filename}`,
        filename: filename,
        size: stats.size,
        created_at: stats.birthtime,
        modified_at: stats.mtime,
        exists: true,
      };
    } catch (error) {
      return {
        filename: filename,
        exists: false,
        error: error.message,
      };
    }
  }
}

module.exports = PresetImageHandler;

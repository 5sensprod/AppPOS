// controllers\base\BaseController.js
const fs = require('fs').promises;
const path = require('path');

class BaseController {
  constructor(model, wooCommerceService) {
    this.model = model;
    this.wooCommerceService = wooCommerceService;
  }

  async getAll(req, res) {
    try {
      const items = await this.model.findAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) return res.status(404).json({ message: 'Item not found' });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const newItem = await this.model.create(req.body);

      if (process.env.SYNC_ON_CHANGE === 'true' && this.wooCommerceService) {
        try {
          const syncResult = await this.wooCommerceService.syncToWooCommerce([newItem]);
          if (syncResult.errors.length > 0) {
            return res.status(207).json({
              item: newItem,
              sync_status: 'failed',
              sync_errors: syncResult.errors,
            });
          }
        } catch (syncError) {
          return res.status(207).json({
            item: newItem,
            sync_status: 'failed',
            sync_error: syncError.message,
          });
        }
      }

      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const updated = await this.model.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: 'Item not found' });

      if (process.env.SYNC_ON_CHANGE === 'true' && this.wooCommerceService) {
        const updatedItem = await this.model.findById(req.params.id);
        await this.wooCommerceService.syncToWooCommerce([updatedItem]);
      }

      res.json({ message: 'Item updated successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const item = await this.model.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Suppression du répertoire d'images
      const imageDir = path.join(process.cwd(), 'public', this.model.imageFolder, req.params.id);
      try {
        await fs.rm(imageDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Erreur suppression répertoire:', err);
      }

      // Suppression de l'entité
      await this.model.delete(req.params.id);

      // Synchronisation WooCommerce si activée
      if (process.env.SYNC_ON_CHANGE === 'true' && this.wooCommerceService) {
        try {
          if (item.image?.wp_id) {
            await this.wooCommerceService.deleteMedia(item.image.wp_id);
          }
          if (item.woo_id) {
            await this.wooCommerceService.wcApi.delete(
              `${this.wooCommerceService.endpoint}/${item.woo_id}`,
              { force: true }
            );
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Erreur suppression WooCommerce:', error);
          }
        }
      }

      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = BaseController;

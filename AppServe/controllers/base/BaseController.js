// controllers\base\BaseController.js

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
      if (!item) return res.status(404).json({ message: 'Item not found' });

      if (process.env.SYNC_ON_CHANGE === 'true' && this.wooCommerceService) {
        await this.wooCommerceService.deleteCategory(req.params.id);
      } else {
        await this.model.delete(req.params.id);
      }

      res.json({ message: 'Item deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = BaseController;

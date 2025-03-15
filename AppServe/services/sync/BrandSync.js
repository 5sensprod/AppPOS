// services/sync/BrandSync.js
const SyncStrategy = require('../base/SyncStrategy');
const Brand = require('../../models/Brand');

class BrandSyncStrategy extends SyncStrategy {
  constructor() {
    super('products/brands');
  }

  async _mapLocalToWooCommerce(brand) {
    const wcData = {
      name: brand.name,
      description: brand.description || '',
      slug: brand.slug || this._generateSlug(brand.name),
    };

    // Sauvegarde de l'ancien ID d'image WordPress pour suppression si nécessaire
    let oldImageWpId = null;
    const WooCommerceClient = require('../base/WooCommerceClient');

    // Vérifier si la marque a déjà une image dans WooCommerce
    if (brand.woo_id) {
      try {
        const client = new WooCommerceClient();
        const response = await client.get(`${this.endpoint}/${brand.woo_id}`);
        if (response.data && response.data.image && response.data.image.id) {
          oldImageWpId = response.data.image.id;
          console.log(
            `[WS-DEBUG] Image WooCommerce existante trouvée pour marque ${brand._id}: wp_id=${oldImageWpId}`
          );
        }
      } catch (error) {
        console.error(
          `[WS-DEBUG] Erreur récupération données WooCommerce pour marque ${brand._id}:`,
          error.message
        );
      }
    }

    // Ajout de l'image si présente
    if (brand.image?.wp_id) {
      wcData.image = {
        id: parseInt(brand.image.wp_id),
        src: brand.image.url,
        alt: brand.name,
      };

      // Si l'ID de l'image a changé, supprimer l'ancienne image
      if (oldImageWpId && parseInt(brand.image.wp_id) !== oldImageWpId) {
        console.log(
          `[WS-DEBUG] Changement d'image détecté: ancien=${oldImageWpId}, nouveau=${brand.image.wp_id}`
        );

        try {
          const client = new WooCommerceClient();
          await client.deleteMedia(oldImageWpId);
          console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
        } catch (delError) {
          console.error(
            `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
            delError.message
          );
        }
      }
    } else if (brand.image && !brand.image.wp_id && brand.image.local_path) {
      // Si l'image existe localement mais n'a pas d'ID WordPress, on tente de la téléverser
      try {
        console.log(
          `[WS-DEBUG] Image existante sans wp_id, tentative de téléversement pour marque ${brand._id}`
        );
        const WordPressImageSync = require('../../services/image/WordPressImageSync');
        const wpSync = new WordPressImageSync();
        const wpData = await wpSync.uploadToWordPress(brand.image.local_path);

        // Mise à jour de l'image avec les données WordPress
        await Brand.update(brand._id, {
          image: {
            ...brand.image,
            wp_id: wpData.id,
            url: wpData.url,
          },
        });

        wcData.image = {
          id: parseInt(wpData.id),
          src: wpData.url,
          alt: brand.name,
        };

        console.log(
          `[WS-DEBUG] Image téléversée avec succès pour marque ${brand._id}, wp_id: ${wpData.id}`
        );

        // Si une ancienne image existe, on la supprimera après le succès de la mise à jour
        if (oldImageWpId && parseInt(wpData.id) !== oldImageWpId) {
          try {
            const client = new WooCommerceClient();
            await client.deleteMedia(oldImageWpId);
            console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
          } catch (delError) {
            console.error(
              `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
              delError.message
            );
          }
        }
      } catch (error) {
        console.error(
          `[WS-DEBUG] Erreur lors du téléversement de l'image pour marque ${brand._id}:`,
          error.message
        );
      }
    } else if (oldImageWpId && !brand.image) {
      // Si la marque n'a plus d'image mais en avait une avant, on la supprime
      console.log(
        `[WS-DEBUG] Suppression de l'image pour marque ${brand._id} car plus d'image associée`
      );
      wcData.image = null;

      try {
        const client = new WooCommerceClient();
        await client.deleteMedia(oldImageWpId);
        console.log(`[WS-DEBUG] Ancienne image WP media supprimée: ${oldImageWpId}`);
      } catch (delError) {
        console.error(
          `[WS-DEBUG] Erreur lors de la suppression de l'ancienne image:`,
          delError.message
        );
      }
    }

    // Ajout des métadonnées si nécessaire
    if (brand.meta_data && brand.meta_data.length > 0) {
      wcData.meta_data = brand.meta_data;
    }

    return wcData;
  }

  _generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async syncToWooCommerce(brand, client, results = { created: 0, updated: 0, errors: [] }) {
    try {
      const wcData = await this._mapLocalToWooCommerce(brand);

      if (brand.woo_id) {
        // Mise à jour
        const response = await client.put(`${this.endpoint}/${brand.woo_id}`, wcData);
        await Brand.update(brand._id, {
          last_sync: new Date(),
          pending_sync: false,
          // Mettre à jour les données de l'image si nécessaire
          ...(response.data.image && {
            image: {
              ...brand.image,
              woo_id: response.data.image.id,
            },
          }),
        });
        results.updated++;
      } else {
        // Création
        const response = await client.post(this.endpoint, wcData);
        await Brand.update(brand._id, {
          woo_id: response.data.id,
          last_sync: new Date(),
          pending_sync: false,
          // Mettre à jour les données de l'image si nécessaire
          ...(response.data.image && {
            image: {
              ...brand.image,
              woo_id: response.data.image.id,
            },
          }),
        });
        results.created++;
      }

      return { success: true, brand, results };
    } catch (error) {
      console.error('Sync error:', error);
      results.errors.push({
        brand_id: brand._id,
        error: error.message,
      });
      return { success: false, error, results };
    }
  }

  async handleFullSync(client, results = { created: 0, updated: 0, deleted: 0, errors: [] }) {
    try {
      const [localBrands, wcResponse] = await Promise.all([
        Brand.findAll(),
        client.get(this.endpoint, { per_page: 100 }),
      ]);

      // Suppression des marques qui n'existent plus en local
      await this._deleteNonExistentBrands(wcResponse.data, localBrands, client, results);

      // Synchronisation des marques locales
      for (const brand of localBrands) {
        await this.syncToWooCommerce(brand, client, results);
      }

      return results;
    } catch (error) {
      results.errors.push({
        error: error.message,
      });
      return results;
    }
  }

  async _deleteNonExistentBrands(wcBrands, localBrands, client, results) {
    for (const wcBrand of wcBrands) {
      if (!localBrands.some((brand) => brand.woo_id === wcBrand.id)) {
        try {
          if (wcBrand.image?.id) {
            await client.deleteMedia(wcBrand.image.id);
          }
          await client.delete(`${this.endpoint}/${wcBrand.id}`, { force: true });
          results.deleted++;
        } catch (error) {
          results.errors.push({
            brand_id: wcBrand.id,
            error: `Erreur suppression WC: ${error.message}`,
          });
        }
      }
    }
  }
}

module.exports = BrandSyncStrategy;

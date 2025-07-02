// AppServe/services/wordpress/WordPressMenuService.js
const axios = require('axios');

class WordPressMenuService {
  constructor() {
    this.wpUrl = process.env.WC_URL;
    this.credentials = Buffer.from(
      `${process.env.WP_USER}:${process.env.WP_APP_PASSWORD}`
    ).toString('base64');

    console.log('🔧 [WP-MENU-SERVICE] Service initialisé:', {
      wpUrl: this.wpUrl ? '✅ Configuré' : '❌ Manquant',
      credentials: this.credentials ? '✅ Configuré' : '❌ Manquant',
    });
  }

  async getMenus() {
    try {
      console.log('📋 [WP-MENU-SERVICE] Récupération de tous les menus...');

      const response = await axios.get(`${this.wpUrl}/wp-json/wp/v2/menus`, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 secondes de timeout
      });

      console.log('✅ [WP-MENU-SERVICE] Menus récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ [WP-MENU-SERVICE] Erreur récupération menus:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw new Error(`Erreur récupération menus WordPress: ${error.message}`);
    }
  }

  async getMenuBySlug(slug = 'main') {
    try {
      console.log(`📋 [WP-MENU-SERVICE] Récupération du menu "${slug}"...`);

      const response = await axios.get(`${this.wpUrl}/wp-json/wp/v2/menus`, {
        params: { slug },
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response.data.length === 0) {
        throw new Error(`Menu avec le slug "${slug}" non trouvé`);
      }

      console.log('✅ [WP-MENU-SERVICE] Menu trouvé:', response.data[0].name);
      return response.data[0];
    } catch (error) {
      console.error(`❌ [WP-MENU-SERVICE] Erreur récupération menu "${slug}":`, error.message);
      throw new Error(`Erreur récupération menu "${slug}": ${error.message}`);
    }
  }

  async getMenuItems(menuId) {
    try {
      console.log(`📋 [WP-MENU-SERVICE] Récupération des éléments du menu ID: ${menuId}...`);

      const response = await axios.get(`${this.wpUrl}/wp-json/wp/v2/menu-items`, {
        params: {
          menus: menuId,
          per_page: 100,
          orderby: 'menu_order',
          order: 'asc',
        },
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ [WP-MENU-SERVICE] Éléments récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error(
        `❌ [WP-MENU-SERVICE] Erreur récupération éléments menu ${menuId}:`,
        error.message
      );
      throw new Error(`Erreur récupération éléments du menu: ${error.message}`);
    }
  }

  async getMainMenuWithItems() {
    try {
      console.log('📋 [WP-MENU-SERVICE] Récupération du menu principal avec éléments...');

      // Récupérer le menu principal
      const mainMenu = await this.getMenuBySlug('main');

      // Récupérer les éléments du menu
      const menuItems = await this.getMenuItems(mainMenu.id);

      // Organiser les éléments en arbre hiérarchique
      const organizedItems = this.organizeMenuItems(menuItems);

      console.log('✅ [WP-MENU-SERVICE] Menu principal complet récupéré:', {
        menuName: mainMenu.name,
        totalItems: menuItems.length,
        rootItems: organizedItems.length,
      });

      return {
        menu: mainMenu,
        items: organizedItems,
        flatItems: menuItems,
      };
    } catch (error) {
      console.error('❌ [WP-MENU-SERVICE] Erreur récupération menu principal:', error.message);
      throw new Error(`Erreur récupération menu principal: ${error.message}`);
    }
  }

  organizeMenuItems(items) {
    console.log('🔄 [WP-MENU-SERVICE] Organisation des éléments en hiérarchie...');

    const itemMap = new Map();
    const rootItems = [];

    // Créer une map de tous les éléments
    items.forEach((item) => {
      itemMap.set(item.id, {
        ...item,
        children: [],
      });
    });

    // Organiser en hiérarchie
    items.forEach((item) => {
      const currentItem = itemMap.get(item.id);

      if (item.parent === 0) {
        // Élément racine
        rootItems.push(currentItem);
      } else {
        // Élément enfant
        const parent = itemMap.get(item.parent);
        if (parent) {
          parent.children.push(currentItem);
        } else {
          // Si le parent n'existe pas, ajouter comme élément racine
          console.warn(
            `⚠️ [WP-MENU-SERVICE] Parent ${item.parent} non trouvé pour l'élément ${item.id}, ajout en racine`
          );
          rootItems.push(currentItem);
        }
      }
    });

    console.log('✅ [WP-MENU-SERVICE] Hiérarchie organisée:', {
      totalItems: items.length,
      rootItems: rootItems.length,
    });

    return rootItems;
  }

  async testConnection() {
    try {
      console.log('🔍 [WP-MENU-SERVICE] Test de connexion...');

      const response = await axios.get(`${this.wpUrl}/wp-json/wp/v2/menus`, {
        headers: {
          Authorization: `Basic ${this.credentials}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 secondes pour le test
      });

      console.log('✅ [WP-MENU-SERVICE] Test de connexion réussi');
      return {
        status: 'success',
        message: 'Connexion WordPress Menu OK',
        menusCount: response.data.length,
      };
    } catch (error) {
      console.error('❌ [WP-MENU-SERVICE] Test de connexion échoué:', {
        message: error.message,
        status: error.response?.status,
        url: this.wpUrl,
      });
      throw new Error(`Test connexion WordPress Menu échoué: ${error.message}`);
    }
  }
}

module.exports = WordPressMenuService;

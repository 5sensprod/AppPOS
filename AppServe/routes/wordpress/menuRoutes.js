// AppServe/routes/wordpress/menuRoutes.js
const express = require('express');
const WordPressMenuService = require('../../services/wordpress/WordPressMenuService');

const router = express.Router();
const menuService = new WordPressMenuService();

// GET /api/wordpress/menu - Récupérer tous les menus
router.get('/', async (req, res) => {
  try {
    console.log('📋 [MENU-API] Récupération de tous les menus WordPress...');

    const menus = await menuService.getMenus();

    console.log('✅ [MENU-API] Menus récupérés avec succès:', menus.length);

    res.json({
      success: true,
      data: menus,
      count: menus.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [MENU-API] Erreur récupération menus:', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/wordpress/menu/main - Récupérer le menu principal avec ses éléments
router.get('/main', async (req, res) => {
  try {
    console.log('📋 [MENU-API] Récupération du menu principal WordPress...');

    const menuData = await menuService.getMainMenuWithItems();

    console.log('✅ [MENU-API] Menu principal récupéré:', {
      menuName: menuData.menu?.name,
      itemsCount: menuData.items?.length,
    });

    res.json({
      success: true,
      data: menuData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [MENU-API] Erreur récupération menu principal:', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/wordpress/menu/:slug - Récupérer un menu par slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    console.log(`📋 [MENU-API] Récupération du menu "${slug}"...`);

    const menu = await menuService.getMenuBySlug(slug);
    const items = await menuService.getMenuItems(menu.id);
    const organizedItems = menuService.organizeMenuItems(items);

    const menuData = {
      menu: menu,
      items: organizedItems,
    };

    console.log('✅ [MENU-API] Menu récupéré:', {
      slug,
      menuName: menu.name,
      itemsCount: items.length,
    });

    res.json({
      success: true,
      data: menuData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ [MENU-API] Erreur récupération menu "${req.params.slug}":`, error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/wordpress/menu/:menuId/items - Récupérer les éléments d'un menu spécifique
router.get('/:menuId/items', async (req, res) => {
  try {
    const { menuId } = req.params;
    console.log(`📋 [MENU-API] Récupération des éléments du menu ID: ${menuId}...`);

    const items = await menuService.getMenuItems(parseInt(menuId));
    const organizedItems = menuService.organizeMenuItems(items);

    console.log('✅ [MENU-API] Éléments du menu récupérés:', items.length);

    res.json({
      success: true,
      data: {
        items: organizedItems,
        flatItems: items,
      },
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `❌ [MENU-API] Erreur récupération éléments menu ${req.params.menuId}:`,
      error.message
    );

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/wordpress/menu/test/connection - Tester la connexion WordPress
router.get('/test/connection', async (req, res) => {
  try {
    console.log('🔍 [MENU-API] Test de connexion WordPress Menu...');

    const result = await menuService.testConnection();

    console.log('✅ [MENU-API] Test de connexion réussi');

    res.json({
      success: true,
      message: 'Connexion WordPress Menu OK',
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [MENU-API] Test de connexion échoué:', error.message);

    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Test de connexion WordPress Menu échoué',
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

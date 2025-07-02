// AppTools/src/hooks/useWordPressMenu.js - Version avec produits WooCommerce
import { useState, useCallback } from 'react';

export const useWordPressMenu = () => {
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(new Set());

  // Configuration depuis les variables d'environnement
  const wpConfig = {
    url: import.meta.env.VITE_WC_URL,
    user: import.meta.env.VITE_WP_USER,
    password: import.meta.env.VITE_WP_APP_PASSWORD,
    consumerKey: import.meta.env.VITE_WC_CONSUMER_KEY,
    consumerSecret: import.meta.env.VITE_WC_CONSUMER_SECRET,
  };

  // Vérification de la configuration
  const isConfigured = wpConfig.url && wpConfig.user && wpConfig.password;
  const isWooConfigured = wpConfig.url && wpConfig.consumerKey && wpConfig.consumerSecret;

  // Headers pour WordPress REST API
  const getWpHeaders = useCallback(() => {
    if (!isConfigured) {
      throw new Error('Configuration WordPress manquante');
    }

    const credentials = btoa(`${wpConfig.user}:${wpConfig.password}`);
    return {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    };
  }, [wpConfig.user, wpConfig.password, isConfigured]);

  // Appel WordPress REST API
  const wpFetch = useCallback(
    async (endpoint, options = {}) => {
      const url = `${wpConfig.url}/wp-json/wp/v2${endpoint}`;

      return fetch(url, {
        method: 'GET',
        ...options,
        headers: {
          ...getWpHeaders(),
          ...options.headers,
        },
      });
    },
    [wpConfig.url, getWpHeaders]
  );

  // Appel WooCommerce REST API
  const wooFetch = useCallback(
    async (endpoint, options = {}) => {
      if (!isWooConfigured) {
        throw new Error('Configuration WooCommerce manquante');
      }

      const url = new URL(`${wpConfig.url}/wp-json/wc/v3${endpoint}`);
      url.searchParams.append('consumer_key', wpConfig.consumerKey);
      url.searchParams.append('consumer_secret', wpConfig.consumerSecret);

      return fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
    },
    [wpConfig.url, wpConfig.consumerKey, wpConfig.consumerSecret, isWooConfigured]
  );

  // Détecter si un élément de menu correspond à une catégorie WooCommerce
  const isWooCommerceCategory = useCallback((menuItem) => {
    if (!menuItem.url) return false;

    // Détecter les URLs de catégories produits
    const categoryPatterns = [
      /\/product-category\//,
      /\/products\//,
      /category=(\d+)/,
      /product_cat=([^&]+)/,
    ];

    return categoryPatterns.some((pattern) => pattern.test(menuItem.url));
  }, []);

  // Extraire l'ID ou slug de catégorie depuis l'URL
  const extractCategoryInfo = useCallback((url) => {
    try {
      // Pattern pour /product-category/slug/
      const slugMatch = url.match(/\/product-category\/([^\/]+)/);
      if (slugMatch) {
        return { type: 'slug', value: slugMatch[1] };
      }

      // Pattern pour ?product_cat=slug
      const paramMatch = url.match(/product_cat=([^&]+)/);
      if (paramMatch) {
        return { type: 'slug', value: paramMatch[1] };
      }

      // Pattern pour category ID
      const idMatch = url.match(/category=(\d+)/);
      if (idMatch) {
        return { type: 'id', value: parseInt(idMatch[1]) };
      }

      return null;
    } catch (error) {
      console.warn('Erreur extraction info catégorie:', error);
      return null;
    }
  }, []);

  // Charger les produits d'une catégorie WooCommerce
  const loadCategoryProducts = useCallback(
    async (menuItem) => {
      if (!isWooConfigured || !isWooCommerceCategory(menuItem)) {
        return [];
      }

      const categoryInfo = extractCategoryInfo(menuItem.url);
      if (!categoryInfo) return [];

      try {
        console.log(`🛍️ [WOO] Chargement produits catégorie ${categoryInfo.value}...`);

        let endpoint = '/products?';
        if (categoryInfo.type === 'slug') {
          // Obtenir l'ID de la catégorie depuis son slug
          const catResponse = await wooFetch(`/products/categories?slug=${categoryInfo.value}`);
          if (catResponse.ok) {
            const categories = await catResponse.json();
            if (categories.length > 0) {
              endpoint += `category=${categories[0].id}`;
            } else {
              return [];
            }
          } else {
            return [];
          }
        } else {
          endpoint += `category=${categoryInfo.value}`;
        }

        // Limiter à 10 produits par catégorie pour la performance
        endpoint += '&per_page=10&status=publish';

        const response = await wooFetch(endpoint);

        if (!response.ok) {
          console.warn(`Erreur chargement produits: ${response.status}`);
          return [];
        }

        const products = await response.json();
        console.log(`✅ [WOO] ${products.length} produits chargés pour "${menuItem.title}"`);

        return products.map((product) => ({
          id: `product-${product.id}`,
          title: product.name,
          url: product.permalink,
          type: 'woo-product',
          price: product.price_html || product.price,
          stock_status: product.stock_status,
          image: product.images?.[0]?.src || null,
          parent: menuItem.id,
          menu_order: 0,
          children: [],
        }));
      } catch (error) {
        console.error(`❌ [WOO] Erreur chargement produits pour "${menuItem.title}":`, error);
        return [];
      }
    },
    [wooFetch, isWooConfigured, isWooCommerceCategory, extractCategoryInfo]
  );

  // Organiser les éléments en hiérarchie
  const organizeMenuItems = useCallback(
    (items) => {
      console.log('🔄 [WP-MENU] Organisation hiérarchique de', items.length, 'éléments');

      const itemMap = new Map();
      const rootItems = [];

      // Nettoyer et créer une map de tous les éléments
      items.forEach((item) => {
        const cleanedItem = {
          ...item,
          title:
            typeof item.title === 'object' && item.title?.rendered
              ? item.title.rendered
              : typeof item.title === 'string'
                ? item.title
                : 'Sans titre',
          url:
            typeof item.url === 'object' && item.url?.rendered
              ? item.url.rendered
              : typeof item.url === 'string'
                ? item.url
                : '',
          children: [],
          isWooCategory: false, // Sera mis à jour plus tard
          products: [],
        };

        itemMap.set(item.id, cleanedItem);
      });

      // Organiser en hiérarchie
      items.forEach((item) => {
        const currentItem = itemMap.get(item.id);

        if (item.parent === 0) {
          rootItems.push(currentItem);
        } else {
          const parent = itemMap.get(item.parent);
          if (parent) {
            parent.children.push(currentItem);
          } else {
            console.warn(`⚠️ Parent ${item.parent} non trouvé pour l'élément ${item.id}`);
            rootItems.push(currentItem);
          }
        }
      });

      // Marquer les éléments qui correspondent à des catégories WooCommerce
      const markWooCategories = (items) => {
        items.forEach((item) => {
          item.isWooCategory = isWooCommerceCategory(item);
          if (item.children.length > 0) {
            markWooCategories(item.children);
          }
        });
      };

      markWooCategories(rootItems);

      console.log('✅ [WP-MENU] Hiérarchie organisée:', {
        total: items.length,
        racine: rootItems.length,
      });

      return rootItems;
    },
    [isWooCommerceCategory]
  );

  // Charger les produits pour un élément de menu spécifique
  const loadProductsForMenuItem = useCallback(
    async (menuItemId) => {
      if (!menuData || loadingProducts.has(menuItemId)) return;

      // Trouver l'élément dans la hiérarchie
      const findMenuItem = (items, targetId) => {
        for (const item of items) {
          if (item.id === targetId) return item;
          if (item.children.length > 0) {
            const found = findMenuItem(item.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const menuItem = findMenuItem(menuData.items, menuItemId);
      if (!menuItem || !menuItem.isWooCategory) return;

      setLoadingProducts((prev) => new Set([...prev, menuItemId]));

      try {
        const products = await loadCategoryProducts(menuItem);

        // Mettre à jour les données du menu avec les produits
        setMenuData((prevData) => {
          const updateMenuItem = (items) => {
            return items.map((item) => {
              if (item.id === menuItemId) {
                return { ...item, products, children: [...item.children, ...products] };
              }
              if (item.children.length > 0) {
                return { ...item, children: updateMenuItem(item.children) };
              }
              return item;
            });
          };

          return {
            ...prevData,
            items: updateMenuItem(prevData.items),
          };
        });
      } catch (error) {
        console.error('Erreur chargement produits:', error);
      } finally {
        setLoadingProducts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(menuItemId);
          return newSet;
        });
      }
    },
    [menuData, loadingProducts, loadCategoryProducts]
  );

  // Charger tous les produits WooCommerce
  const loadAllProducts = useCallback(async () => {
    if (!isWooConfigured) return [];

    try {
      console.log('🛍️ [WOO] Chargement de tous les produits...');

      const response = await wooFetch('/products?per_page=50&status=publish');

      if (!response.ok) {
        console.warn(`Erreur chargement produits: ${response.status}`);
        return [];
      }

      const products = await response.json();
      console.log(`✅ [WOO] ${products.length} produits chargés`);

      return products.map((product) => ({
        id: `product-${product.id}`,
        title: product.name,
        url: product.permalink,
        type: 'woo-product',
        price: product.price_html || product.price,
        stock_status: product.stock_status,
        image: product.images?.[0]?.src || null,
        parent: 0,
        menu_order: 0,
        children: [],
        category_names: product.categories?.map((cat) => cat.name).join(', ') || '',
        isWooCategory: false,
      }));
    } catch (error) {
      console.error('❌ [WOO] Erreur chargement tous produits:', error);
      return [];
    }
  }, [wooFetch, isWooConfigured]);

  // Charger le menu principal
  const loadMainMenu = useCallback(async () => {
    if (!isConfigured) {
      setError('Configuration WordPress manquante. Vérifiez votre fichier .env');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 [WP-MENU] Chargement du menu principal WordPress...');

      // 1. Récupérer le menu
      let menuResponse = await wpFetch('/menus?slug=main');

      if (!menuResponse.ok) {
        throw new Error(
          `Erreur récupération menu: ${menuResponse.status} - ${menuResponse.statusText}`
        );
      }

      let menus = await menuResponse.json();

      if (menus.length === 0) {
        menuResponse = await wpFetch('/menus?slug=primary');
        if (menuResponse.ok) {
          menus = await menuResponse.json();
        }
      }

      if (menus.length === 0) {
        menuResponse = await wpFetch('/menus');
        if (menuResponse.ok) {
          const allMenus = await menuResponse.json();
          if (allMenus.length > 0) {
            menus = [allMenus[0]];
          }
        }
      }

      if (menus.length === 0) {
        throw new Error('Aucun menu trouvé sur le site WordPress');
      }

      const mainMenu = menus[0];
      console.log('✅ [WP-MENU] Menu trouvé:', mainMenu.name);

      // 2. Récupérer les éléments du menu
      const itemsResponse = await wpFetch(
        `/menu-items?menus=${mainMenu.id}&per_page=100&orderby=menu_order&order=asc`
      );

      if (!itemsResponse.ok) {
        throw new Error(
          `Erreur récupération éléments: ${itemsResponse.status} - ${itemsResponse.statusText}`
        );
      }

      const items = await itemsResponse.json();
      console.log('✅ [WP-MENU] Éléments récupérés:', items.length);

      const organizedItems = organizeMenuItems(items);

      // ✅ NOUVEAU : Ajouter automatiquement tous les produits
      let finalItems = organizedItems;

      if (isWooConfigured) {
        try {
          const allProducts = await loadAllProducts();
          if (allProducts.length > 0) {
            // Créer un élément de menu "Produits" avec tous les produits
            const productsMenuItem = {
              id: 'all-products-menu',
              title: `🛍️ Tous les produits (${allProducts.length})`,
              url: '',
              type: 'woo-products-container',
              isWooCategory: true,
              children: allProducts,
              products: allProducts,
              parent: 0,
              menu_order: 999,
            };

            finalItems = [...organizedItems, productsMenuItem];
            console.log(`✅ [WP-MENU] Ajout de ${allProducts.length} produits au menu`);
          }
        } catch (error) {
          console.warn('⚠️ [WP-MENU] Impossible de charger les produits:', error.message);
        }
      }

      const result = {
        menu: mainMenu,
        items: finalItems,
        flatItems: items,
      };

      console.log('✅ [WP-MENU] Menu complet chargé:', {
        menuName: mainMenu.name,
        totalItems: items.length,
        rootItems: finalItems.length,
        wooCategories: finalItems.filter((item) => item.isWooCategory).length,
        totalProducts: finalItems
          .filter((item) => item.products)
          .reduce((sum, item) => sum + item.products.length, 0),
      });

      setMenuData(result);
    } catch (err) {
      console.error('❌ [WP-MENU] Erreur chargement menu:', err);
      setError(`Erreur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [wpFetch, organizeMenuItems, isConfigured]);

  // Statistiques
  const getMenuStats = useCallback((items = []) => {
    let totalItems = 0;
    let maxDepth = 0;
    let wooCategories = 0;

    const calculate = (itemList, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      itemList.forEach((item) => {
        totalItems++;
        if (item.isWooCategory) wooCategories++;
        if (item.children && item.children.length > 0) {
          calculate(item.children, depth + 1);
        }
      });
    };

    calculate(items);

    return { totalItems, maxDepth, rootItems: items.length, wooCategories };
  }, []);

  return {
    // État
    menuData,
    loading,
    error,
    isConfigured,
    isWooConfigured,
    loadingProducts,

    // Actions
    loadMainMenu,
    loadProductsForMenuItem,

    // Données dérivées
    menuItems: menuData?.items || [],
    menuInfo: menuData?.menu || null,
    stats: getMenuStats(menuData?.items || []),
  };
};

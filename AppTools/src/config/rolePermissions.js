// src/config/rolePermissions.js
/**
 * Configuration des permissions par rôle
 *
 * Structure:
 * {
 *   roleName: {
 *     allowedMenus: ['menu-id-1', 'menu-id-2', ...],
 *     description: 'Description du rôle'
 *   }
 * }
 */

export const ROLE_PERMISSIONS = {
  admin: {
    allowedMenus: [
      'dashboard',
      'cashier',
      'products',
      'categories',
      'suppliers',
      'brands',
      'sales',
      'wordpress',
      'wp-menu',
      'reports',
      'settings',
      'users-management',
      'lcd-config',
      'printer-config',
      'general-settings',
    ],
    description: 'Accès complet à toutes les fonctionnalités',
  },

  cashier: {
    allowedMenus: [
      'dashboard',
      'cashier', // ✅ Page caisse
      'products', // ✅ Voir les produits
      'categories', // ✅ Voir les catégories
      'brands', // ✅ Voir les marques
      'sales', // ✅ Voir les ventes (historique)
    ],
    description: 'Accès à la caisse et consultation des produits',
  },

  user: {
    allowedMenus: [
      'dashboard', // ✅ Tableau de bord
      'products', // ✅ Voir les produits
      'categories', // ✅ Voir les catégories
      'suppliers', // ✅ Voir les fournisseurs
      'brands', // ✅ Voir les marques
    ],
    description: 'Accès en lecture seule aux produits',
  },
};

/**
 * Vérifie si un rôle a accès à un menu spécifique
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string} menuId - L'ID du menu à vérifier
 * @returns {boolean}
 */
export function hasAccessToMenu(role, menuId) {
  if (!role) return false;

  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;

  return rolePermissions.allowedMenus.includes(menuId);
}

/**
 * Vérifie si un rôle a accès à au moins un des menus
 * @param {string} role - Le rôle de l'utilisateur
 * @param {string[]} menuIds - Liste des IDs de menus
 * @returns {boolean}
 */
export function hasAccessToAnyMenu(role, menuIds) {
  if (!role || !menuIds || menuIds.length === 0) return false;
  return menuIds.some((menuId) => hasAccessToMenu(role, menuId));
}

/**
 * Obtenir tous les menus accessibles pour un rôle
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {string[]}
 */
export function getAllowedMenus(role) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions ? rolePermissions.allowedMenus : [];
}

/**
 * Obtenir la description d'un rôle
 * @param {string} role - Le rôle
 * @returns {string}
 */
export function getRoleDescription(role) {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions ? rolePermissions.description : 'Rôle inconnu';
}

/**
 * Obtenir tous les rôles disponibles
 * @returns {Array<{role: string, description: string, allowedMenus: string[]}>}
 */
export function getAllRoles() {
  return Object.entries(ROLE_PERMISSIONS).map(([role, config]) => ({
    role,
    description: config.description,
    allowedMenus: config.allowedMenus,
  }));
}

// AppServe/models/RolePermissions.js
const fs = require('fs').promises;
const path = require('path');
const pathManager = require('../utils/PathManager');

// Permissions par défaut
const DEFAULT_PERMISSIONS = {
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
    discountPermissions: {
      canApplyItemDiscount: true,
      canApplyTicketDiscount: true,
      maxItemDiscountPercent: 100,
      maxTicketDiscountPercent: 100,
      maxItemDiscountAmount: null,
      maxTicketDiscountAmount: null,
      requiresReason: false,
    },
  },
  cashier: {
    allowedMenus: ['cashier', 'products', 'categories', 'brands', 'sales'],
    description: 'Accès à la caisse et consultation des produits',
    discountPermissions: {
      canApplyItemDiscount: true,
      canApplyTicketDiscount: false,
      maxItemDiscountPercent: 10,
      maxTicketDiscountPercent: 0,
      maxItemDiscountAmount: 20,
      maxTicketDiscountAmount: 0,
      requiresReason: true,
    },
  },
  user: {
    allowedMenus: ['dashboard', 'products', 'categories', 'suppliers', 'brands'],
    description: 'Accès en lecture seule aux produits',
    discountPermissions: {
      canApplyItemDiscount: false,
      canApplyTicketDiscount: false,
      maxItemDiscountPercent: 0,
      maxTicketDiscountPercent: 0,
      maxItemDiscountAmount: 0,
      maxTicketDiscountAmount: 0,
      requiresReason: true,
    },
  },
};

class RolePermissionsModel {
  constructor() {
    this.filePath = path.join(pathManager.getDataPath(), 'role-permissions.json');
    this.permissions = null;
  }

  /**
   * Charger les permissions depuis le fichier
   */
  async load() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      this.permissions = JSON.parse(data);
      console.log('✅ [PERMISSIONS] Permissions chargées depuis le fichier');
      return this.permissions;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📝 [PERMISSIONS] Fichier non trouvé, création avec valeurs par défaut');
        this.permissions = DEFAULT_PERMISSIONS;
        await this.save();
        return this.permissions;
      }
      throw error;
    }
  }

  /**
   * Sauvegarder les permissions dans le fichier
   */
  async save() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.permissions, null, 2), 'utf8');
      console.log('✅ [PERMISSIONS] Permissions sauvegardées');
      return true;
    } catch (error) {
      console.error('❌ [PERMISSIONS] Erreur sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Obtenir toutes les permissions
   */
  async getAll() {
    if (!this.permissions) {
      await this.load();
    }
    return this.permissions;
  }

  /**
   * Obtenir les permissions d'un rôle
   */
  async getRole(role) {
    if (!this.permissions) {
      await this.load();
    }
    return this.permissions[role] || null;
  }

  /**
   * Mettre à jour les permissions d'un rôle
   */
  async updateRole(role, newPermissions) {
    if (!this.permissions) {
      await this.load();
    }

    // Validation basique
    if (!newPermissions.allowedMenus || !Array.isArray(newPermissions.allowedMenus)) {
      throw new Error('allowedMenus doit être un tableau');
    }

    if (!newPermissions.discountPermissions) {
      throw new Error('discountPermissions est requis');
    }

    // Mettre à jour
    this.permissions[role] = {
      ...this.permissions[role],
      ...newPermissions,
      updatedAt: new Date().toISOString(),
    };

    await this.save();
    return this.permissions[role];
  }

  /**
   * Créer un nouveau rôle
   */
  async createRole(role, permissions) {
    if (!this.permissions) {
      await this.load();
    }

    if (this.permissions[role]) {
      throw new Error(`Le rôle ${role} existe déjà`);
    }

    this.permissions[role] = {
      ...permissions,
      createdAt: new Date().toISOString(),
    };

    await this.save();
    return this.permissions[role];
  }

  /**
   * Supprimer un rôle
   */
  async deleteRole(role) {
    if (!this.permissions) {
      await this.load();
    }

    // Empêcher la suppression des rôles de base
    if (['admin', 'cashier', 'user'].includes(role)) {
      throw new Error('Impossible de supprimer les rôles système');
    }

    if (!this.permissions[role]) {
      throw new Error(`Le rôle ${role} n'existe pas`);
    }

    delete this.permissions[role];
    await this.save();
    return true;
  }

  /**
   * Réinitialiser aux valeurs par défaut
   */
  async reset() {
    this.permissions = DEFAULT_PERMISSIONS;
    await this.save();
    return this.permissions;
  }
}

module.exports = new RolePermissionsModel();

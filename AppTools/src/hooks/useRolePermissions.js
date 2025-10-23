// src/hooks/useRolePermissions.jsx
import { useState, useEffect } from 'react';
import apiService from '../services/api';

// Cache global des permissions (partagé entre tous les composants)
let cachedPermissions = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook pour charger et utiliser les permissions depuis l'API
 */
export function useRolePermissions() {
  const [permissions, setPermissions] = useState(cachedPermissions);
  const [loading, setLoading] = useState(!cachedPermissions);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    // Utiliser le cache si valide
    if (cachedPermissions && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPermissions(cachedPermissions);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.get('/api/role-permissions');

      cachedPermissions = response.data.permissions;
      cacheTimestamp = Date.now();

      setPermissions(cachedPermissions);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement permissions:', err);
      setError(err);

      // Fallback sur permissions par défaut en cas d'erreur
      cachedPermissions = getDefaultPermissions();
      setPermissions(cachedPermissions);
    } finally {
      setLoading(false);
    }
  };

  const refreshPermissions = async () => {
    cachedPermissions = null;
    cacheTimestamp = null;
    await loadPermissions();
  };

  return {
    permissions,
    loading,
    error,
    refreshPermissions,
  };
}

/**
 * Vérifier si un rôle a accès à un menu
 */
export function hasAccessToMenu(permissions, role, menuId) {
  if (!permissions || !role) return false;

  const rolePermissions = permissions[role];
  if (!rolePermissions) return false;

  return rolePermissions.allowedMenus?.includes(menuId) || false;
}

/**
 * Obtenir les permissions de réduction pour un rôle
 */
export function getDiscountPermissions(permissions, role) {
  if (!permissions || !role) return getDefaultDiscountPermissions();

  const rolePermissions = permissions[role];
  return rolePermissions?.discountPermissions || getDefaultDiscountPermissions();
}

/**
 * Vérifier si un utilisateur peut appliquer une réduction sur un item
 */
export function canApplyItemDiscount(permissions, role) {
  return getDiscountPermissions(permissions, role).canApplyItemDiscount;
}

/**
 * Vérifier si un utilisateur peut appliquer une réduction globale
 */
export function canApplyTicketDiscount(permissions, role) {
  return getDiscountPermissions(permissions, role).canApplyTicketDiscount;
}

/**
 * Valider une réduction selon les permissions du rôle
 */
export function validateDiscount(permissions, role, type, discount, itemPrice = 0) {
  const perms = getDiscountPermissions(permissions, role);

  if (type === 'item' && !perms.canApplyItemDiscount) {
    return {
      valid: false,
      error: "Vous n'avez pas la permission d'appliquer des réductions sur les articles",
    };
  }

  if (type === 'ticket' && !perms.canApplyTicketDiscount) {
    return {
      valid: false,
      error: "Vous n'avez pas la permission d'appliquer des réductions globales",
    };
  }

  if (perms.requiresReason && (!discount.reason || discount.reason.trim() === '')) {
    return { valid: false, error: 'Une raison est obligatoire pour cette réduction' };
  }

  const maxPercent =
    type === 'item' ? perms.maxItemDiscountPercent : perms.maxTicketDiscountPercent;
  const maxAmount = type === 'item' ? perms.maxItemDiscountAmount : perms.maxTicketDiscountAmount;

  if (discount.type === 'percentage') {
    if (discount.value > maxPercent) {
      return {
        valid: false,
        error: `Réduction maximale autorisée : ${maxPercent}%`,
      };
    }
  }

  if (discount.type === 'fixed') {
    if (maxAmount !== null && discount.value > maxAmount) {
      return {
        valid: false,
        error: `Réduction maximale autorisée : ${maxAmount}€`,
      };
    }

    if (type === 'item' && discount.value > itemPrice) {
      return {
        valid: false,
        error: "La réduction ne peut pas dépasser le prix de l'article",
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Permissions par défaut (fallback)
 */
function getDefaultPermissions() {
  return {
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
        'tools', // ✅ AJOUTÉ
        'labels', // ✅ AJOUTÉ
        'reports',
        'settings',
        'users-management',
        'permissions-config',
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
      allowedMenus: [
        'cashier',
        'products',
        'categories',
        'brands',
        'sales',
        'tools', // ✅ AJOUTÉ (caissiers peuvent créer des affiches)
        'labels', // ✅ AJOUTÉ
      ],
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
      allowedMenus: [
        'dashboard',
        'products',
        'categories',
        'suppliers',
        'brands',
        'tools', // ✅ AJOUTÉ (utilisateurs peuvent consulter)
        'labels', // ✅ AJOUTÉ
      ],
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
}

function getDefaultDiscountPermissions() {
  return {
    canApplyItemDiscount: false,
    canApplyTicketDiscount: false,
    maxItemDiscountPercent: 0,
    maxTicketDiscountPercent: 0,
    maxItemDiscountAmount: 0,
    maxTicketDiscountAmount: 0,
    requiresReason: true,
  };
}

/**
 * Fonction pour vider le cache (utile après modification des permissions)
 */
export function clearPermissionsCache() {
  cachedPermissions = null;
  cacheTimestamp = null;
}

// Export par défaut (si nécessaire)
export default useRolePermissions;

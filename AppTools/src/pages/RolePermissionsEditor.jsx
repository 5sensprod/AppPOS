import React, { useState, useEffect } from 'react';
import { Shield, Save, RotateCcw, Check, X, Lock, Unlock } from 'lucide-react';
import apiService from '../services/api';
import { clearPermissionsCache } from '../hooks/useRolePermissions';
import { usePermissions } from '../contexts/PermissionsProvider';

const RolePermissionsEditor = () => {
  const [roles, setRoles] = useState({});
  const [selectedRole, setSelectedRole] = useState('admin');
  const [editedPermissions, setEditedPermissions] = useState(null);
  const { refreshPermissions } = usePermissions();
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Tous les menus disponibles
  const allMenus = [
    { id: 'dashboard', label: 'Tableau de bord', category: 'Principal' },
    { id: 'cashier', label: 'Caisse', category: 'Principal' },
    { id: 'products', label: 'Produits', category: 'Inventaire' },
    { id: 'categories', label: 'Catégories', category: 'Inventaire' },
    { id: 'suppliers', label: 'Fournisseurs', category: 'Inventaire' },
    { id: 'brands', label: 'Marques', category: 'Inventaire' },
    { id: 'sales', label: 'Ventes', category: 'Commerce' },
    { id: 'wordpress', label: 'WordPress', category: 'Intégrations' },
    { id: 'wp-menu', label: 'Menu WordPress', category: 'Intégrations' },
    { id: 'reports', label: 'Rapports', category: 'Analyse' },
    { id: 'settings', label: 'Paramètres', category: 'Configuration' },
    { id: 'users-management', label: 'Gestion Utilisateurs', category: 'Configuration' },
    { id: 'lcd-config', label: 'Configuration LCD', category: 'Configuration' },
    { id: 'printer-config', label: 'Configuration Imprimante', category: 'Configuration' },
    { id: 'general-settings', label: 'Paramètres Généraux', category: 'Configuration' },
  ];

  // Charger les permissions
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/role-permissions');
      setRoles(response.data.permissions);
      setEditedPermissions(response.data.permissions[selectedRole]);
    } catch (error) {
      console.error('Erreur chargement permissions:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement' });
    } finally {
      setLoading(false);
    }
  };

  // Changer de rôle sélectionné
  const handleRoleChange = (role) => {
    if (hasChanges) {
      if (!window.confirm('Vous avez des modifications non sauvegardées. Continuer ?')) {
        return;
      }
    }
    setSelectedRole(role);
    setEditedPermissions(roles[role]);
    setHasChanges(false);
  };

  // Toggle menu access
  const toggleMenu = (menuId) => {
    const currentMenus = editedPermissions.allowedMenus || [];
    const newMenus = currentMenus.includes(menuId)
      ? currentMenus.filter((id) => id !== menuId)
      : [...currentMenus, menuId];

    setEditedPermissions({
      ...editedPermissions,
      allowedMenus: newMenus,
    });
    setHasChanges(true);
  };

  // Modifier les permissions de réduction
  const updateDiscountPermission = (field, value) => {
    setEditedPermissions({
      ...editedPermissions,
      discountPermissions: {
        ...editedPermissions.discountPermissions,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  // Sauvegarder

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiService.put(`/api/role-permissions/${selectedRole}`, editedPermissions);

      // ✅ IMPORTANT : Rafraîchir le cache des permissions
      clearPermissionsCache();
      await refreshPermissions();

      // Recharger
      await loadPermissions();

      setHasChanges(false);
      setMessage({ type: 'success', text: 'Permissions sauvegardées et appliquées !' });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      // ... gestion erreur
    } finally {
      setSaving(false);
    }
  };

  // Annuler
  const handleCancel = () => {
    setEditedPermissions(roles[selectedRole]);
    setHasChanges(false);
  };

  // Réinitialiser
  const handleReset = async () => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir réinitialiser toutes les permissions aux valeurs par défaut ?'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await apiService.post('/api/role-permissions/reset');
      await loadPermissions();
      setHasChanges(false);
      setMessage({ type: 'success', text: 'Permissions réinitialisées !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la réinitialisation' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!editedPermissions) return null;

  // Grouper par catégorie
  const menusByCategory = allMenus.reduce((acc, menu) => {
    if (!acc[menu.category]) acc[menu.category] = [];
    acc[menu.category].push(menu);
    return acc;
  }, {});

  const discountPerms = editedPermissions.discountPermissions || {};

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                Éditeur de Permissions
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configurez les accès et droits par rôle
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>

            {hasChanges && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Sauvegarder
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Sélection du rôle */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Sélectionner un rôle
            </h3>
            <div className="space-y-2">
              {Object.keys(roles).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedRole === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium capitalize">{role}</div>
                  <div className="text-xs opacity-75 mt-1">{roles[role].description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Menus Access */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Accès aux Menus
            </h2>

            <div className="space-y-4">
              {Object.entries(menusByCategory).map(([category, menus]) => (
                <div
                  key={category}
                  className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
                >
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {menus.map((menu) => {
                      const hasAccess = editedPermissions.allowedMenus.includes(menu.id);
                      return (
                        <button
                          key={menu.id}
                          onClick={() => toggleMenu(menu.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                            hasAccess
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {hasAccess ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          {menu.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Discount Permissions */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Permissions de Réductions
            </h2>

            <div className="space-y-4">
              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountPerms.canApplyItemDiscount}
                    onChange={(e) =>
                      updateDiscountPermission('canApplyItemDiscount', e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Réductions articles
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountPerms.canApplyTicketDiscount}
                    onChange={(e) =>
                      updateDiscountPermission('canApplyTicketDiscount', e.target.checked)
                    }
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Réductions globales
                  </span>
                </label>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max % Article
                  </label>
                  <input
                    type="number"
                    value={discountPerms.maxItemDiscountPercent || 0}
                    onChange={(e) =>
                      updateDiscountPermission(
                        'maxItemDiscountPercent',
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max € Article
                  </label>
                  <input
                    type="number"
                    value={discountPerms.maxItemDiscountAmount || 0}
                    onChange={(e) =>
                      updateDiscountPermission(
                        'maxItemDiscountAmount',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max % Ticket
                  </label>
                  <input
                    type="number"
                    value={discountPerms.maxTicketDiscountPercent || 0}
                    onChange={(e) =>
                      updateDiscountPermission(
                        'maxTicketDiscountPercent',
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max € Ticket
                  </label>
                  <input
                    type="number"
                    value={discountPerms.maxTicketDiscountAmount || 0}
                    onChange={(e) =>
                      updateDiscountPermission(
                        'maxTicketDiscountAmount',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Requires Reason */}
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={discountPerms.requiresReason}
                  onChange={(e) => updateDiscountPermission('requiresReason', e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Motif obligatoire pour les réductions
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Description du Rôle
            </h2>
            <textarea
              value={editedPermissions.description || ''}
              onChange={(e) => {
                setEditedPermissions({
                  ...editedPermissions,
                  description: e.target.value,
                });
                setHasChanges(true);
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Description du rôle..."
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important :</strong> Les modifications seront appliquées immédiatement après
                la sauvegarde. Les utilisateurs devront se reconnecter pour que les changements
                prennent effet.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsEditor;

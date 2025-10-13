// AppServe/controllers/rolePermissionsController.js
const rolePermissionsModel = require('../models/RolePermissions');

/**
 * GET /api/role-permissions
 * Récupérer toutes les permissions
 */
async function getAllPermissions(req, res) {
  try {
    const permissions = await rolePermissionsModel.getAll();

    res.json({
      success: true,
      permissions,
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur récupération:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des permissions',
    });
  }
}

/**
 * GET /api/role-permissions/:role
 * Récupérer les permissions d'un rôle
 */
async function getRolePermissions(req, res) {
  try {
    const { role } = req.params;
    const permissions = await rolePermissionsModel.getRole(role);

    if (!permissions) {
      return res.status(404).json({
        success: false,
        message: `Rôle ${role} non trouvé`,
      });
    }

    res.json({
      success: true,
      role,
      permissions,
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur récupération rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du rôle',
    });
  }
}

/**
 * PUT /api/role-permissions/:role
 * Mettre à jour les permissions d'un rôle
 */
async function updateRolePermissions(req, res) {
  try {
    const { role } = req.params;
    const newPermissions = req.body;

    const updated = await rolePermissionsModel.updateRole(role, newPermissions);

    console.log(`✅ [ROLE-PERMS] Rôle ${role} mis à jour par ${req.user.username}`);

    res.json({
      success: true,
      message: 'Permissions mises à jour avec succès',
      role,
      permissions: updated,
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur mise à jour:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour',
    });
  }
}

/**
 * POST /api/role-permissions
 * Créer un nouveau rôle
 */
async function createRole(req, res) {
  try {
    const { role, permissions } = req.body;

    if (!role || !permissions) {
      return res.status(400).json({
        success: false,
        message: 'Nom du rôle et permissions requis',
      });
    }

    const created = await rolePermissionsModel.createRole(role, permissions);

    console.log(`✅ [ROLE-PERMS] Nouveau rôle ${role} créé par ${req.user.username}`);

    res.status(201).json({
      success: true,
      message: 'Rôle créé avec succès',
      role,
      permissions: created,
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur création:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création',
    });
  }
}

/**
 * DELETE /api/role-permissions/:role
 * Supprimer un rôle
 */
async function deleteRole(req, res) {
  try {
    const { role } = req.params;

    await rolePermissionsModel.deleteRole(role);

    console.log(`✅ [ROLE-PERMS] Rôle ${role} supprimé par ${req.user.username}`);

    res.json({
      success: true,
      message: 'Rôle supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur suppression:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
}

/**
 * POST /api/role-permissions/reset
 * Réinitialiser aux valeurs par défaut
 */
async function resetPermissions(req, res) {
  try {
    const permissions = await rolePermissionsModel.reset();

    console.log(`⚠️ [ROLE-PERMS] Permissions réinitialisées par ${req.user.username}`);

    res.json({
      success: true,
      message: 'Permissions réinitialisées aux valeurs par défaut',
      permissions,
    });
  } catch (error) {
    console.error('❌ [ROLE-PERMS] Erreur réinitialisation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation',
    });
  }
}

module.exports = {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  createRole,
  deleteRole,
  resetPermissions,
};

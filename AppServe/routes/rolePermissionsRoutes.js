// AppServe/routes/rolePermissionsRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../utils/auth');
const {
  getAllPermissions,
  getRolePermissions,
  updateRolePermissions,
  createRole,
  deleteRole,
  resetPermissions,
} = require('../controllers/rolePermissionsController');

// 🔒 TOUTES LES ROUTES SONT RÉSERVÉES AUX ADMINS

// GET /api/role-permissions - Lister toutes les permissions
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllPermissions);

// GET /api/role-permissions/:role - Récupérer un rôle
router.get('/:role', authMiddleware, roleMiddleware(['admin']), getRolePermissions);

// PUT /api/role-permissions/:role - Modifier un rôle
router.put('/:role', authMiddleware, roleMiddleware(['admin']), updateRolePermissions);

// POST /api/role-permissions - Créer un rôle
router.post('/', authMiddleware, roleMiddleware(['admin']), createRole);

// DELETE /api/role-permissions/:role - Supprimer un rôle
router.delete('/:role', authMiddleware, roleMiddleware(['admin']), deleteRole);

// POST /api/role-permissions/reset - Réinitialiser
router.post('/reset', authMiddleware, roleMiddleware(['admin']), resetPermissions);

module.exports = router;

// routes/userManagementRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../utils/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
} = require('../controllers/userManagementController');

// 🔒 TOUTES LES ROUTES SONT PROTÉGÉES ET RÉSERVÉES AUX ADMINS

// GET /api/users - Lister tous les utilisateurs
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllUsers);

// GET /api/users/:id - Récupérer un utilisateur
router.get('/:id', authMiddleware, roleMiddleware(['admin']), getUserById);

// POST /api/users - Créer un utilisateur
router.post('/', authMiddleware, roleMiddleware(['admin']), createUser);

// PUT /api/users/:id - Modifier un utilisateur
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateUser);

// PUT /api/users/:id/password - Changer le mot de passe
router.put('/:id/password', authMiddleware, roleMiddleware(['admin']), changeUserPassword);

// DELETE /api/users/:id - Supprimer un utilisateur
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);

module.exports = router;

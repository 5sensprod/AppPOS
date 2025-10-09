// routes/authRoutes.js - VERSION SIMPLIFIÉE QUI FONCTIONNE
const express = require('express');
const router = express.Router();
const { loginUser, registerUser } = require('../controllers/authController');
const { authMiddleware } = require('../utils/auth');

// Route de connexion
router.post('/login', loginUser);

// Route d'inscription
router.post('/register', registerUser);

// ✅ Route pour récupérer l'utilisateur actuel (inline, pas de dépendance externe)
router.get('/me', authMiddleware, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        c,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Erreur getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations utilisateur',
    });
  }
});

module.exports = router;

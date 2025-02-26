// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getCurrentUser } = require('../controllers/authController');
const { authMiddleware } = require('../utils/auth');

// Route de connexion
router.post('/login', loginUser);

// Route d'inscription
router.post('/register', registerUser);

// Route pour récupérer l'utilisateur actuel (protégée)
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;

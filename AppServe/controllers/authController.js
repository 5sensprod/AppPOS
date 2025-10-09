// controllers/authController.js
const { login, register } = require('../utils/auth');

/**
 * Contrôleur pour gérer la connexion
 */
async function loginUser(req, res) {
  try {
    const { username, password } = req.body;

    // Validation de base
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur et mot de passe requis",
      });
    }

    // Tentative de connexion
    const result = await login(username, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
    });
  }
}

/**
 * Contrôleur pour gérer l'inscription
 */
async function registerUser(req, res) {
  try {
    const { username, password, role } = req.body;

    // Validation de base
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur et mot de passe requis",
      });
    }

    // Validation de la complexité du mot de passe
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Tentative d'inscription
    const result = await register({ username, password, role });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'inscription",
    });
  }
}

/**
 * Contrôleur pour récupérer les informations de l'utilisateur connecté
 * Les informations viennent du token JWT décodé par authMiddleware
 */
function getCurrentUser(req, res) {
  try {
    // req.user est ajouté par authMiddleware après validation du token
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
}

module.exports = {
  loginUser,
  registerUser,
  getCurrentUser,
};

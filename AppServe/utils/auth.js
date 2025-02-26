// utils/auth.js
const jwt = require('jsonwebtoken');
const Datastore = require('nedb');
const path = require('path');
const bcrypt = require('bcrypt'); // Vous devrez installer cette dépendance

// Initialiser la base de données utilisateurs
const usersDb = new Datastore({
  filename: path.join(__dirname, '../data/users.db'),
  autoload: true,
});

// Clé secrète pour signer les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète_par_défaut'; // À définir dans .env en production
const TOKEN_EXPIRY = '24h'; // Durée de validité du token

/**
 * Génère un token JWT pour un utilisateur
 * @param {Object} user Objet utilisateur (sans le mot de passe)
 * @returns {String} Token JWT
 */
function generateToken(user) {
  // Ne jamais inclure le mot de passe dans le token
  const userForToken = {
    id: user._id,
    username: user.username,
    role: user.role,
  };

  return jwt.sign(userForToken, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Vérifie les identifiants et connecte un utilisateur
 * @param {String} username Nom d'utilisateur
 * @param {String} password Mot de passe
 * @returns {Promise<Object>} Résultat de connexion { success, token, user, message }
 */
function login(username, password) {
  return new Promise((resolve, reject) => {
    usersDb.findOne({ username }, async (err, user) => {
      if (err) {
        return reject(new Error('Erreur de base de données'));
      }

      if (!user) {
        return resolve({
          success: false,
          message: 'Identifiants incorrects',
        });
      }

      try {
        // Vérification du mot de passe
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
          return resolve({
            success: false,
            message: 'Identifiants incorrects',
          });
        }

        // Générer un token JWT
        const token = generateToken(user);

        // Ne jamais retourner le hash du mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        resolve({
          success: true,
          token,
          user: userWithoutPassword,
        });
      } catch (error) {
        reject(new Error('Erreur lors de la vérification du mot de passe'));
      }
    });
  });
}

/**
 * Crée un nouvel utilisateur
 * @param {Object} userData Données utilisateur
 * @returns {Promise<Object>} Résultat de création { success, user, message }
 */
async function register(userData) {
  return new Promise(async (resolve, reject) => {
    try {
      // Vérifier si l'utilisateur existe déjà
      usersDb.findOne({ username: userData.username }, async (err, existingUser) => {
        if (err) {
          return reject(new Error('Erreur de base de données'));
        }

        if (existingUser) {
          return resolve({
            success: false,
            message: "Ce nom d'utilisateur est déjà pris",
          });
        }

        // Hacher le mot de passe
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);

        // Créer l'utilisateur
        const newUser = {
          username: userData.username,
          passwordHash,
          role: userData.role || 'user',
          createdAt: new Date(),
        };

        // Sauvegarder l'utilisateur dans la base de données
        usersDb.insert(newUser, (err, user) => {
          if (err) {
            return reject(new Error("Erreur lors de la création de l'utilisateur"));
          }

          // Ne jamais retourner le hash du mot de passe
          const { passwordHash, ...userWithoutPassword } = user;

          resolve({
            success: true,
            user: userWithoutPassword,
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Middleware pour vérifier l'authentification
 */
function authMiddleware(req, res, next) {
  // Récupérer le token d'authentification
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ajouter les informations de l'utilisateur à la requête
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expirée. Veuillez vous reconnecter.' });
    }

    return res.status(403).json({ message: 'Token invalide.' });
  }
}

/**
 * Middleware pour vérifier les rôles
 * @param {String[]} roles Rôles autorisés
 */
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        message: "Vous n'avez pas les permissions nécessaires pour cette action.",
      });
    }
  };
}

module.exports = {
  login,
  register,
  generateToken,
  authMiddleware,
  roleMiddleware,
};

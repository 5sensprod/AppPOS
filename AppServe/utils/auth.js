// utils/auth.js
const jwt = require('jsonwebtoken');
const Datastore = require('nedb');
const path = require('path');
const bcrypt = require('bcrypt');

// Initialiser la base de données utilisateurs
const usersDb = new Datastore({
  filename: path.join(__dirname, '../data/users.db'),
  autoload: true,
});

// Clé secrète pour signer les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète_par_défaut';

/**
 * Génère un token JWT SANS expiration pour POS
 * @param {Object} user Objet utilisateur (sans le mot de passe)
 * @returns {String} Token JWT persistant
 */
function generateToken(user) {
  const userForToken = {
    id: user._id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // Issued at
    // PAS D'EXPIRATION - Token valide jusqu'à déconnexion manuelle
  };

  return jwt.sign(userForToken, JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'AppPOS-Server',
    audience: 'AppPOS-Client',
    // Pas de expiresIn
  });
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

        // Générer un token JWT persistant
        const token = generateToken(user);

        // Ne jamais retourner le hash du mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        resolve({
          success: true,
          token,
          user: userWithoutPassword,
          tokenInfo: {
            persistent: true,
            message: "Token valide jusqu'à déconnexion",
          },
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
 * Middleware pour vérifier l'authentification (sans expiration)
 */
function authMiddleware(req, res, next) {
  // Récupérer le token d'authentification
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Accès non autorisé. Token manquant.',
      code: 'NO_TOKEN',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Vérifier et décoder le token (ignorer l'expiration)
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: true, // Ignorer l'expiration pour token persistant
    });

    // Ajouter les informations de l'utilisateur à la requête
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Token invalide.',
        code: 'INVALID_TOKEN',
      });
    }

    console.error('Erreur JWT:', error);
    return res.status(403).json({
      message: 'Erreur de vérification du token.',
      code: 'TOKEN_ERROR',
    });
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

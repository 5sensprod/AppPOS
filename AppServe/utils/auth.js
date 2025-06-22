// utils/auth.js - AVEC VALIDATION REDÉMARRAGE SERVEUR
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

// 🔧 NOUVEAU : ID unique du serveur généré au démarrage
const SERVER_STARTUP_ID = Date.now().toString();

/**
 * Récupère l'ID de démarrage du serveur actuel
 */
function getServerStartupId() {
  return SERVER_STARTUP_ID;
}

/**
 * Génère un token JWT avec l'ID du serveur pour validation
 * @param {Object} user Objet utilisateur (sans le mot de passe)
 * @returns {String} Token JWT avec ID serveur
 */
function generateToken(user) {
  const userForToken = {
    id: user._id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000), // Issued at
    server_id: SERVER_STARTUP_ID, // 🔧 NOUVEAU : ID du serveur qui a généré ce token
  };

  return jwt.sign(userForToken, JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'AppPOS-Server',
    audience: 'AppPOS-Client',
    // Pas de expiresIn - Token valide jusqu'à redémarrage serveur
  });
}

/**
 * Vérifie les identifiants et connecte un utilisateur
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

        // Générer un token JWT avec ID serveur
        const token = generateToken(user);

        // Ne jamais retourner le hash du mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        resolve({
          success: true,
          token,
          user: userWithoutPassword,
          tokenInfo: {
            persistent: true,
            message: "Token valide jusqu'à redémarrage serveur",
            server_id: SERVER_STARTUP_ID, // 🔧 NOUVEAU : Inclure l'ID serveur
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
 * Middleware pour vérifier l'authentification AVEC validation du redémarrage serveur
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
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: true, // Toujours ignorer l'expiration
    });

    // 🔧 NOUVEAU : Vérifier que le token a été généré par cette instance du serveur
    if (decoded.server_id && decoded.server_id !== SERVER_STARTUP_ID) {
      console.log(
        `🔄 [AUTH] Token invalide - serveur redémarré. Token ID: ${decoded.server_id}, Serveur ID: ${SERVER_STARTUP_ID}`
      );
      return res.status(401).json({
        message: 'Token invalide - serveur redémarré.',
        code: 'SERVER_RESTARTED',
        server_restarted: true, // 🔧 Flag spécial pour le frontend
      });
    }

    // 🔧 NOUVEAU : Si token ancien (sans server_id), l'invalider aussi
    if (!decoded.server_id) {
      console.log('🔄 [AUTH] Token ancien sans server_id - invalidation');
      return res.status(401).json({
        message: 'Token obsolète - reconnexion requise.',
        code: 'TOKEN_OBSOLETE',
        server_restarted: true,
      });
    }

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
  getServerStartupId, // 🔧 NOUVEAU : Exposer l'ID serveur
};

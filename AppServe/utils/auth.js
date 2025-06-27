// utils/auth.js - MODIFIÉ POUR TOKEN 24H EN DEV
const jwt = require('jsonwebtoken');
const Datastore = require('nedb');
const path = require('path');
const bcrypt = require('bcrypt');
const pathManager = require('./PathManager');

const usersDb = new Datastore({
  filename: pathManager.getDataPath('users.db'),
  autoload: true,
});

// Clé secrète pour signer les tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète_par_défaut';

// 🔧 CONFIGURATION TOKEN DEPUIS .ENV OU VALEURS PAR DÉFAUT
const currentEnv = process.env.NODE_ENV || 'development';

const config = {
  // Expiration du token depuis .env ou défaut selon environnement
  expiresIn: process.env.JWT_EXPIRES_IN || (currentEnv === 'development' ? '24h' : '24h'),

  // Invalider au redémarrage depuis .env ou défaut selon environnement
  useServerRestart:
    process.env.JWT_INVALIDATE_ON_RESTART === 'true' ||
    (currentEnv === 'production' && process.env.JWT_INVALIDATE_ON_RESTART !== 'false'),
};

// ID unique du serveur généré au démarrage (utilisé seulement en production)
const SERVER_STARTUP_ID = Date.now().toString();

console.log(`🔧 [AUTH] Mode: ${currentEnv}`);
console.log(`🔧 [AUTH] Token expiration: ${config.expiresIn || 'Aucune'}`);
console.log(`🔧 [AUTH] Validation redémarrage serveur: ${config.useServerRestart ? 'Oui' : 'Non'}`);

/**
 * Récupère l'ID de démarrage du serveur actuel
 */
function getServerStartupId() {
  return SERVER_STARTUP_ID;
}

/**
 * Génère un token JWT selon la configuration d'environnement
 * @param {Object} user Objet utilisateur (sans le mot de passe)
 * @returns {String} Token JWT
 */
function generateToken(user) {
  const userForToken = {
    id: user._id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };

  // Ajouter l'ID serveur seulement si nécessaire (production)
  if (config.useServerRestart) {
    userForToken.server_id = SERVER_STARTUP_ID;
  }

  const signOptions = {
    algorithm: 'HS256',
    issuer: 'AppPOS-Server',
    audience: 'AppPOS-Client',
  };

  // Ajouter l'expiration seulement si configurée
  if (config.expiresIn) {
    signOptions.expiresIn = config.expiresIn;
  }

  return jwt.sign(userForToken, JWT_SECRET, signOptions);
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

        // Générer un token JWT selon la config
        const token = generateToken(user);

        // Ne jamais retourner le hash du mot de passe
        const { passwordHash, ...userWithoutPassword } = user;

        // Message adapté selon l'environnement
        const tokenMessage = config.expiresIn
          ? `Token valide pendant ${config.expiresIn}`
          : "Token valide jusqu'à redémarrage serveur";

        resolve({
          success: true,
          token,
          user: userWithoutPassword,
          tokenInfo: {
            persistent: !config.useServerRestart,
            message: tokenMessage,
            environment: currentEnv,
            expiresIn: config.expiresIn,
            server_id: config.useServerRestart ? SERVER_STARTUP_ID : null,
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
 * Middleware pour vérifier l'authentification selon la configuration
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
    // Options de vérification selon l'environnement
    const verifyOptions = {
      ignoreExpiration: !config.expiresIn, // Ignorer expiration si pas configurée
    };

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, JWT_SECRET, verifyOptions);

    // Vérifier l'ID serveur seulement si configuré (production)
    if (config.useServerRestart && decoded.server_id && decoded.server_id !== SERVER_STARTUP_ID) {
      console.log(
        `🔄 [AUTH] Token invalide - serveur redémarré. Token ID: ${decoded.server_id}, Serveur ID: ${SERVER_STARTUP_ID}`
      );
      return res.status(401).json({
        message: 'Token invalide - serveur redémarré.',
        code: 'SERVER_RESTARTED',
        server_restarted: true,
      });
    }

    // En production, invalider les tokens anciens sans server_id
    if (config.useServerRestart && !decoded.server_id) {
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

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expiré.',
        code: 'TOKEN_EXPIRED',
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
  getServerStartupId,
};

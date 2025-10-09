// controllers/userManagementController.js
const bcrypt = require('bcrypt');

// ✅ UTILISER L'INSTANCE UNIQUE CENTRALISÉE
const usersDb = require('../models/User');

/**
 * 📋 Lister tous les utilisateurs (sans les mots de passe)
 * GET /api/users
 */
async function getAllUsers(req, res) {
  try {
    usersDb.find({}, (err, users) => {
      if (err) {
        console.error('❌ [USER-MGMT] Erreur récupération utilisateurs:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la récupération des utilisateurs',
        });
      }

      // Retirer les mots de passe
      const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);

      res.json({
        success: true,
        users: usersWithoutPassword,
        count: users.length,
      });
    });
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

/**
 * 🔍 Récupérer un utilisateur par ID
 * GET /api/users/:id
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    usersDb.findOne({ _id: id }, (err, user) => {
      if (err) {
        console.error('❌ [USER-MGMT] Erreur recherche utilisateur:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la recherche',
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      // Retirer le mot de passe
      const { passwordHash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        user: userWithoutPassword,
      });
    });
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

/**
 * ➕ Créer un nouvel utilisateur (admin uniquement)
 * POST /api/users
 */
async function createUser(req, res) {
  try {
    const { username, password, role } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Nom d'utilisateur et mot de passe requis",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      });
    }

    // Validation du rôle
    const validRoles = ['admin', 'user', 'cashier'];
    const userRole = role || 'user';

    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: `Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}`,
      });
    }

    // Vérifier si l'utilisateur existe déjà
    usersDb.findOne({ username }, async (err, existingUser) => {
      if (err) {
        console.error('❌ [USER-MGMT] Erreur vérification utilisateur:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la vérification',
        });
      }

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Ce nom d'utilisateur est déjà pris",
        });
      }

      try {
        // Hacher le mot de passe
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Créer l'utilisateur
        const newUser = {
          username,
          passwordHash,
          role: userRole,
          createdAt: new Date(),
          createdBy: req.user.username,
          isActive: true,
        };

        usersDb.insert(newUser, (err, user) => {
          if (err) {
            console.error('❌ [USER-MGMT] Erreur création utilisateur:', err);
            return res.status(500).json({
              success: false,
              message: "Erreur lors de la création de l'utilisateur",
            });
          }

          // Ne pas retourner le hash
          const { passwordHash, ...userWithoutPassword } = user;

          console.log(`✅ [USER-MGMT] Utilisateur créé: ${username} (${userRole})`);

          res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            user: userWithoutPassword,
          });
        });
      } catch (error) {
        console.error('❌ [USER-MGMT] Erreur hash mot de passe:', error);
        res.status(500).json({
          success: false,
          message: 'Erreur lors du traitement du mot de passe',
        });
      }
    });
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

/**
 * ✏️ Modifier un utilisateur
 * PUT /api/users/:id
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { username, role, isActive } = req.body;

    // Empêcher de se désactiver soi-même
    if (req.user.id === id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas vous désactiver vous-même',
      });
    }

    // Construire l'objet de mise à jour
    const updateData = {
      updatedAt: new Date(),
      updatedBy: req.user.username,
    };

    if (username !== undefined) {
      // Vérifier que le nouveau nom n'existe pas déjà
      const existingUser = await new Promise((resolve, reject) => {
        usersDb.findOne({ username, _id: { $ne: id } }, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Ce nom d'utilisateur est déjà utilisé",
        });
      }

      updateData.username = username;
    }

    if (role !== undefined) {
      const validRoles = ['admin', 'user', 'cashier'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}`,
        });
      }
      updateData.role = role;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Mise à jour
    usersDb.update({ _id: id }, { $set: updateData }, {}, (err, numReplaced) => {
      if (err) {
        console.error('❌ [USER-MGMT] Erreur mise à jour:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la mise à jour',
        });
      }

      if (numReplaced === 0) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      console.log(`✅ [USER-MGMT] Utilisateur ${id} mis à jour`);

      res.json({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
      });
    });
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

/**
 * 🔑 Changer le mot de passe d'un utilisateur
 * PUT /api/users/:id/password
 */
async function changeUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    usersDb.update(
      { _id: id },
      {
        $set: {
          passwordHash,
          updatedAt: new Date(),
          updatedBy: req.user.username,
        },
      },
      {},
      (err, numReplaced) => {
        if (err) {
          console.error('❌ [USER-MGMT] Erreur changement mot de passe:', err);
          return res.status(500).json({
            success: false,
            message: 'Erreur lors du changement de mot de passe',
          });
        }

        if (numReplaced === 0) {
          return res.status(404).json({
            success: false,
            message: 'Utilisateur non trouvé',
          });
        }

        console.log(`✅ [USER-MGMT] Mot de passe changé pour utilisateur ${id}`);

        res.json({
          success: true,
          message: 'Mot de passe changé avec succès',
        });
      }
    );
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

/**
 * 🗑️ Supprimer un utilisateur
 * DELETE /api/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // Empêcher de se supprimer soi-même
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      });
    }

    usersDb.remove({ _id: id }, {}, (err, numRemoved) => {
      if (err) {
        console.error('❌ [USER-MGMT] Erreur suppression:', err);
        return res.status(500).json({
          success: false,
          message: 'Erreur lors de la suppression',
        });
      }

      if (numRemoved === 0) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      console.log(`✅ [USER-MGMT] Utilisateur ${id} supprimé`);

      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès',
      });
    });
  } catch (error) {
    console.error('❌ [USER-MGMT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changeUserPassword,
  deleteUser,
};

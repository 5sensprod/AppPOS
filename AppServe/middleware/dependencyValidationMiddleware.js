// middleware/dependencyValidationMiddleware.js
const dependencyService = require('../services/dependencyValidationService');

function createDependencyValidationMiddleware(options = {}) {
  const { entityType, getEntity, includeDetails = true } = options;

  return async (req, res, next) => {
    try {
      const entityId = req.params.id;

      // Récupérer l'entité
      let entity;
      if (getEntity) {
        entity = await getEntity(entityId);
      } else {
        const models = {
          brand: require('../models/Brand'),
          supplier: require('../models/Supplier'),
          category: require('../models/Category'),
        };

        const Model = models[entityType];
        if (!Model) {
          return res.status(400).json({
            success: false,
            error: `Type d'entité non supporté: ${entityType}`,
          });
        }

        entity = await Model.findById(entityId);
      }

      if (!entity) {
        const entityNames = {
          brand: 'Marque',
          supplier: 'Fournisseur',
          category: 'Catégorie',
        };
        return res.status(404).json({
          success: false,
          error: `${entityNames[entityType] || 'Entité'} non trouvée`,
        });
      }

      // Valider la sécurité de suppression
      await dependencyService.validateCompleteEntityDeletion(entityType, entity, {
        includeDetails,
      });

      // Stocker l'entité dans req pour éviter une nouvelle requête
      req.entity = entity;
      next();
    } catch (error) {
      // Gestion des erreurs de dépendance
      if (error.code === 'DEPENDENCY_VIOLATION') {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: {
            linkedProducts: error.linkedProducts,
            ...(error.hasMore && { hasMore: error.hasMore }),
          },
        });
      }

      if (error.code === 'HIERARCHY_VIOLATION') {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: {
            children: error.children,
          },
        });
      }

      if (error.code === 'BRAND_DEPENDENCY_VIOLATION') {
        return res.status(400).json({
          success: false,
          error: error.message,
          details: {
            brandsWithProducts: error.brandsWithProducts,
          },
        });
      }

      // Autres erreurs
      return res.status(500).json({
        success: false,
        error: error.message || 'Erreur interne du serveur',
      });
    }
  };
}

// Middlewares préconfigurés
const brandDependencyValidation = createDependencyValidationMiddleware({
  entityType: 'brand',
  getEntity: async (id) => {
    const Brand = require('../models/Brand');
    return await Brand.findById(id);
  },
});

const supplierDependencyValidation = createDependencyValidationMiddleware({
  entityType: 'supplier',
  getEntity: async (id) => {
    const Supplier = require('../models/Supplier');
    return await Supplier.findById(id);
  },
});

const categoryDependencyValidation = createDependencyValidationMiddleware({
  entityType: 'category',
  getEntity: async (id) => {
    const Category = require('../models/Category');
    return await Category.findById(id);
  },
});

module.exports = {
  createDependencyValidationMiddleware,
  brandDependencyValidation,
  supplierDependencyValidation,
  categoryDependencyValidation,
};

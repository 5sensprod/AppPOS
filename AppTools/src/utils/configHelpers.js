// src/features/suppliers/utils/configHelpers.js

/**
 * Utilitaires pour enrichir la configuration avec des données dynamiques
 */

/**
 * Injecte les options dynamiques dans une configuration d'entité
 * @param {Object} config - Configuration de base (ex: supplierConfig)
 * @param {Object} specialFields - Données dynamiques par champ
 * @returns {Object} Configuration enrichie avec les options
 */
export function injectDynamicOptions(config, specialFields = {}) {
  if (!config.tabs) return config;

  const enrichedConfig = {
    ...config,
    tabs: config.tabs.map((tab) => ({
      ...tab,
      sections: tab.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) => {
          // Si le champ a des options dynamiques configurées
          const specialField = specialFields[field.name];

          if (specialField?.options) {
            return {
              ...field,
              options: specialField.options,
              // Hériter des propriétés spéciales si définies
              ...(specialField.showImages && { showImages: specialField.showImages }),
            };
          }

          return field;
        }),
      })),
    })),
  };

  return enrichedConfig;
}

/**
 * Formate les options de brands pour le multiselect
 * @param {Array} brands - Liste des brands depuis l'API
 * @param {Function} imageUrlFormatter - Fonction pour formater les URLs d'images
 * @returns {Array} Options formatées pour react-select
 */
export function formatBrandOptions(brands = [], imageUrlFormatter = null) {
  return brands.map((brand) => ({
    value: brand._id,
    label: brand.name,
    image: (() => {
      if (!brand.image?.src) return null;

      // Si pas de formateur ou formateur défaillant, utiliser l'URL brute
      if (!imageUrlFormatter) {
        return brand.image.src;
      }

      try {
        // Vérifier que le formateur est bien une fonction
        if (typeof imageUrlFormatter !== 'function') {
          console.warn("⚠️ imageUrlFormatter n'est pas une fonction");
          return brand.image.src;
        }

        return imageUrlFormatter(brand.image.src);
      } catch (error) {
        console.warn('⚠️ Erreur formatage image URL pour brand:', brand.name, error);
        return brand.image.src; // Fallback vers l'URL originale
      }
    })(),
  }));
}

/**
 * Crée l'objet specialFields pour les suppliers
 * @param {Object} dependencies - Dépendances nécessaires
 * @param {Array} dependencies.brands - Liste des brands
 * @param {Function} dependencies.imageUrlFormatter - Formateur d'URL images
 * @returns {Object} Objet specialFields prêt à injecter
 */
export function createSupplierSpecialFields({ brands = [], imageUrlFormatter }) {
  // 🔥 NOUVEAU : Vérification de la disponibilité du formateur d'images
  const safeImageFormatter =
    imageUrlFormatter && typeof imageUrlFormatter === 'function' ? imageUrlFormatter : null;

  return {
    brands: {
      options: formatBrandOptions(brands, safeImageFormatter),
      showImages: !!safeImageFormatter, // Afficher les images seulement si le formateur fonctionne
    },
  };
}

/**
 * Hook personnalisé pour enrichir une config avec des données dynamiques
 * @param {Object} baseConfig - Configuration de base
 * @param {Object} dynamicData - Données dynamiques à injecter
 * @returns {Object} Configuration enrichie
 */
export function useEnrichedConfig(baseConfig, dynamicData = {}) {
  // Pour les suppliers, créer automatiquement les specialFields
  if (baseConfig.entityName === 'fournisseur') {
    const specialFields = createSupplierSpecialFields(dynamicData);
    return injectDynamicOptions(baseConfig, specialFields);
  }

  // Pour d'autres entités, utiliser les specialFields fournis directement
  return injectDynamicOptions(baseConfig, dynamicData.specialFields || {});
}

/**
 * Récupère les tabs visibles selon le mode (création vs édition)
 * @param {Object} config - Configuration de l'entité
 * @param {boolean} isNew - Mode création ou édition
 * @returns {Array} Liste des tabs à afficher
 */
export function getVisibleTabs(config, isNew = false) {
  if (isNew && config.createModeTabs) {
    return config.tabs.filter((tab) => config.createModeTabs.includes(tab.id));
  }

  if (!isNew && config.editModeTabs) {
    return config.tabs.filter((tab) => config.editModeTabs.includes(tab.id));
  }

  // Fallback : tous les tabs
  return config.tabs;
}

/**
 * Valide qu'une configuration est complète
 * @param {Object} config - Configuration à valider
 * @returns {Object} Résultat de validation { isValid, errors }
 */
export function validateConfig(config) {
  const errors = [];

  if (!config.entityName) {
    errors.push('entityName est requis');
  }

  if (!config.tabs || !Array.isArray(config.tabs)) {
    errors.push('tabs doit être un tableau');
  } else {
    config.tabs.forEach((tab, tabIndex) => {
      if (!tab.id) {
        errors.push(`tab[${tabIndex}].id est requis`);
      }
      if (!tab.sections || !Array.isArray(tab.sections)) {
        errors.push(`tab[${tabIndex}].sections doit être un tableau`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export default {
  injectDynamicOptions,
  formatBrandOptions,
  createSupplierSpecialFields,
  useEnrichedConfig,
  getVisibleTabs,
  validateConfig,
};

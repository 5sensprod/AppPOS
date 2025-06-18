// hooks/useActionToasts.js - VERSION CORRIGÉE
import { useToastStore } from '../stores/useToastStore';

export const useActionToasts = () => {
  const { success, error, warning, progress, updateToast, removeToast } = useToastStore();

  const toastActions = {
    // Actions de suppression
    deletion: {
      start: (count, entityName) => {
        const message =
          count === 1
            ? `Suppression du ${entityName} en cours...`
            : `Suppression de ${count} ${entityName}s en cours...`;

        return progress(message, {
          title: 'Suppression',
          progress: { current: 0, total: count },
        });
      },
      success: (count, entityName) => {
        const message =
          count === 1
            ? `${entityName} supprimé avec succès`
            : `${count} ${entityName}s supprimés avec succès`;

        success(message, { title: 'Suppression terminée' });
      },
      error: (errorMessage, entityName) => {
        error(`Erreur lors de la suppression : ${errorMessage}`, {
          title: 'Erreur de suppression',
        });
      },
    },

    // Actions de synchronisation
    sync: {
      start: (count, entityName) => {
        const message =
          count === 1
            ? `Synchronisation du ${entityName} en cours...`
            : `Synchronisation de ${count} ${entityName}s...`;

        return progress(message, {
          title: 'Synchronisation',
          progress: { current: 0, total: count, label: 'éléments traités' },
        });
      },
      updateProgress: (toastId, current, total) => {
        updateToast(toastId, {
          progress: { current, total, label: 'éléments traités' },
        });
      },
      success: (count, entityName) => {
        const message =
          count === 1
            ? `${entityName} synchronisé avec succès`
            : `${count} ${entityName}s synchronisés avec succès`;

        success(message, { title: 'Synchronisation terminée' });
      },
      error: (errorMessage, entityName) => {
        error(`Erreur de synchronisation : ${errorMessage}`, {
          title: 'Erreur de synchronisation',
        });
      },
    },

    // Actions de changement de statut
    status: {
      success: (count, newStatus, entityName) => {
        const message =
          count === 1
            ? `Statut du ${entityName} changé en "${newStatus}"`
            : `Statut de ${count} ${entityName}s changé en "${newStatus}"`;

        success(message, { title: 'Statut mis à jour' });
      },
      error: (errorMessage) => {
        error(`Erreur lors du changement de statut : ${errorMessage}`, {
          title: 'Erreur de statut',
        });
      },
    },

    // Actions de catégorie
    category: {
      success: (count, entityName) => {
        success(`Catégorie${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour`, {
          title: 'Succès',
        });
      },
      error: (errorMessage) => {
        error(`Erreur lors de la mise à jour`, {
          title: 'Erreur de catégorie',
        });
      },
    },

    // Actions de stock
    stock: {
      success: (count, action, entityName) => {
        const actionLabels = {
          set: 'défini',
          add: 'ajouté au stock',
          subtract: 'retiré du stock',
          set_min_stock: 'stock minimum défini',
          enable_manage: 'affichage du stock activé',
          disable_manage: 'affichage du stock désactivé',
          toggle_manage: 'gestion du stock basculée',
        };

        const actionLabel = actionLabels[action] || 'mis à jour';

        const message =
          count === 1
            ? `Stock du ${entityName} ${actionLabel}`
            : `Stock de ${count} ${entityName}s ${actionLabel}`;

        success(message, { title: 'Stock mis à jour' });
      },
      error: (errorMessage) => {
        error(`Erreur lors de la mise à jour du stock : ${errorMessage}`, {
          title: 'Erreur de stock',
        });
      },
    },

    // Actions d'export
    export: {
      start: (count, format, entityName) => {
        return progress(`Génération de l'export ${format.toUpperCase()} en cours...`, {
          title: 'Export',
          progress: { current: 0, total: 100, label: '% complété' },
        });
      },
      success: (format) => {
        success(`Export ${format.toUpperCase()} généré avec succès`, {
          title: 'Export terminé',
        });
      },
      error: (errorMessage) => {
        error(`Erreur lors de l'export : ${errorMessage}`, {
          title: "Erreur d'export",
        });
      },
    },

    // Actions génériques
    generic: {
      success: (message, title = 'Succès') => success(message, { title }),
      error: (message, title = 'Erreur') => error(message, { title }),
      warning: (message, title = 'Attention') => warning(message, { title }),
      info: (message, title = 'Information') => success(message, { title }),
    },
  };

  return {
    toastActions,
    // Accès direct aux méthodes du store
    success,
    error,
    warning,
    progress,
    updateToast,
    removeToast,
  };
};

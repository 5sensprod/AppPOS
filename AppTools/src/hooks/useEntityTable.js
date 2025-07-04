// src/hooks/useEntityTable.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useActionToasts } from '../components/common/EntityTable/components/BatchActions/hooks/useActionToasts';

export const useEntityTable = ({
  entityType,
  fetchEntities,
  deleteEntity,
  syncEntity,
  // Nouveaux paramètres pour les opérations par lot
  batchDeleteEntities,
  batchSyncEntities,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toastActions } = useActionToasts(); // ✅ AJOUT

  // Stocker les fonctions dans une ref pour éviter de recréer les callbacks
  const functionsRef = useRef({
    fetchEntities,
    deleteEntity,
    syncEntity,
    batchDeleteEntities,
    batchSyncEntities,
  });

  // Mettre à jour la ref quand les fonctions changent
  useEffect(() => {
    functionsRef.current = {
      fetchEntities,
      deleteEntity,
      syncEntity,
      batchDeleteEntities,
      batchSyncEntities,
    };
  }, [fetchEntities, deleteEntity, syncEntity, batchDeleteEntities, batchSyncEntities]);

  const executeOperation = useCallback(async (operation) => {
    setLoading(true);
    setError(null);
    try {
      await operation();
    } catch (err) {
      console.error(`Erreur lors de l'opération:`, err);
      setError(err.message || `Erreur lors de l'opération`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEntities = useCallback(() => {
    return executeOperation(async () => {
      if (typeof functionsRef.current.fetchEntities === 'function') {
        await functionsRef.current.fetchEntities();
      }
    });
  }, [executeOperation]);

  // Exécuter une seule fois au montage du composant
  useEffect(() => {
    // Ne pas appeler loadEntities ici
    // Le chargement initial doit être contrôlé par ProductTable
  }, []); // Tableau de dépendances vide = exécution unique au montage

  // ✅ FONCTION HANDLEDELETEENTITY MODIFIÉE
  const handleDeleteEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.deleteEntity) return;

      try {
        setLoading(true);
        setError(null);

        await functionsRef.current.deleteEntity(id);

        // ✅ SUPPRIMÉ - Plus de toast ici
        // toastActions.deletion.success(1, entityType);

        // Recharger les données
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      } catch (err) {
        console.error('Erreur suppression:', err);

        // ✅ GESTION SPÉCIALE DES ERREURS DE DÉPENDANCE (garder pour la vue detail)
        if (err.response?.status === 400 && err.response?.data?.details?.linkedProducts) {
          const errorData = err.response.data;
          const productCount = errorData.details.linkedProducts.length;

          // Toast informatif au lieu d'erreur (pour la vue detail)
          toastActions.deletion.error(
            `${errorData.error}\n\n${productCount} produit(s) concerné(s)`,
            entityType
          );

          return { success: false, dependency: true, data: errorData };
        }

        // ✅ SUPPRIMÉ - Plus de toasts d'erreur ici pour vue table
        // toastActions.deletion.error(errorMessage, entityType);

        // Autres erreurs (réseau, 500, etc.)
        const errorMessage = err.response?.data?.error || err.message || 'Erreur inconnue';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [entityType, toastActions] // ✅ Garder toastActions pour les erreurs de dépendance
  );

  const handleSyncEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.syncEntity) return;
      return executeOperation(async () => {
        await functionsRef.current.syncEntity(id);
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      });
    },
    [executeOperation]
  );

  // ✅ FONCTION BATCH DELETE MODIFIÉE
  const handleBatchDeleteEntities = useCallback(
    async (ids) => {
      console.log(`🗑️ Suppression par lot de ${ids.length} ${entityType}s`);

      try {
        setLoading(true);
        setError(null);

        // Si une fonction de suppression par lot est fournie, l'utiliser
        if (functionsRef.current.batchDeleteEntities) {
          await functionsRef.current.batchDeleteEntities(ids);
        }
        // Sinon, fallback sur la suppression élément par élément
        else if (functionsRef.current.deleteEntity) {
          for (const id of ids) {
            await functionsRef.current.deleteEntity(id);
          }
        }

        // Recharger les données
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      } catch (err) {
        console.error('Erreur suppression par lot:', err);
        // ✅ Laisser EntityTable gérer l'erreur et les toasts
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [entityType] // ✅ SUPPRIMÉ toastActions des dépendances
  );

  // Nouvelle fonction pour la synchronisation par lot
  const handleBatchSyncEntities = useCallback(
    async (ids) => {
      console.log(`🔄 Synchronisation par lot de ${ids.length} ${entityType}s`);

      // Si une fonction de synchronisation par lot est fournie, l'utiliser
      if (functionsRef.current.batchSyncEntities) {
        return executeOperation(async () => {
          await functionsRef.current.batchSyncEntities(ids);
          if (typeof functionsRef.current.fetchEntities === 'function') {
            await functionsRef.current.fetchEntities();
          }
        });
      }
      // Sinon, fallback sur la synchronisation élément par élément
      else if (functionsRef.current.syncEntity) {
        return executeOperation(async () => {
          const errors = [];
          for (const id of ids) {
            try {
              await functionsRef.current.syncEntity(id);
            } catch (error) {
              console.error(`❌ Erreur lors de la synchronisation du ${entityType} #${id}:`, error);
              errors.push({ id, error: error.message || String(error) });
              // Continuer avec les autres entités même en cas d'erreur
            }
          }

          if (typeof functionsRef.current.fetchEntities === 'function') {
            await functionsRef.current.fetchEntities();
          }

          if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} erreurs lors de la synchronisation par lot`, errors);
          }
        });
      }
    },
    [entityType, executeOperation]
  );

  return {
    loading,
    error,
    loadEntities,
    handleDeleteEntity,
    ...(syncEntity && { handleSyncEntity }),
    // Ajouter les fonctions de traitement par lot
    handleBatchDeleteEntities,
    ...(syncEntity && { handleBatchSyncEntities }),
    executeOperation,
  };
};

export default useEntityTable;

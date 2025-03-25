// src/hooks/useEntityTable.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useEntityTable = ({ fetchEntities, deleteEntity, syncEntity }) => {
  // État
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Référence pour suivre si une opération est en cours
  const operationInProgress = useRef(false);

  // Fonction pour exécuter une opération avec gestion des états
  const executeOperation = useCallback(async (operation) => {
    if (operationInProgress.current) return;

    operationInProgress.current = true;
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
      operationInProgress.current = false;
    }
  }, []);

  // Fonction pour charger les données avec gestion des erreurs
  const loadEntities = useCallback(() => {
    return executeOperation(async () => {
      await fetchEntities();
    });
  }, [fetchEntities, executeOperation]);

  // Chargement initial des données
  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Gestion de la suppression
  const handleDeleteEntity = useCallback(
    async (id) => {
      return executeOperation(async () => {
        await deleteEntity(id);
        // Avec Zustand, le store est mis à jour automatiquement via les réducteurs
        // mais on peut rafraîchir les données pour être sûr
        await fetchEntities();
      });
    },
    [deleteEntity, fetchEntities, executeOperation]
  );

  // Gestion de la synchronisation
  const handleSyncEntity = useCallback(
    async (id) => {
      if (!syncEntity) return;

      return executeOperation(async () => {
        await syncEntity(id);
        // Avec Zustand, le store est mis à jour automatiquement via les réducteurs
        // mais on peut rafraîchir les données pour être sûr
        await fetchEntities();
      });
    },
    [syncEntity, fetchEntities, executeOperation]
  );

  return {
    loading,
    error,
    loadEntities,
    handleDeleteEntity,
    handleSyncEntity,
    executeOperation,
    operationInProgress: operationInProgress.current,
  };
};

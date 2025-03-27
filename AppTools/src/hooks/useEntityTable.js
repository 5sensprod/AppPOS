// src/hooks/useEntityTable.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useEntityTable = ({ fetchEntities, deleteEntity, syncEntity }) => {
  // État
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Référence pour suivre si une opération est en cours
  const operationInProgress = useRef(false);

  // Référence pour stocker les fonctions pour éviter les problèmes de dépendances
  const functionsRef = useRef({
    fetchEntities,
    deleteEntity,
    syncEntity,
  });

  // Mettre à jour les références si les fonctions changent
  useEffect(() => {
    functionsRef.current = {
      fetchEntities,
      deleteEntity,
      syncEntity,
    };
  }, [fetchEntities, deleteEntity, syncEntity]);

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
      if (typeof functionsRef.current.fetchEntities === 'function') {
        await functionsRef.current.fetchEntities();
      } else {
        console.warn("fetchEntities n'est pas une fonction");
      }
    });
  }, [executeOperation]);

  // Chargement initial des données
  useEffect(() => {
    let shouldLoad = true;
    if (shouldLoad && typeof functionsRef.current.fetchEntities === 'function') {
      loadEntities();
    }
    return () => {
      shouldLoad = false;
    };
  }, [loadEntities]);

  // Gestion de la suppression
  const handleDeleteEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.deleteEntity) {
        console.warn("deleteEntity n'est pas défini");
        return;
      }

      return executeOperation(async () => {
        await functionsRef.current.deleteEntity(id);
        // Rafraîchir seulement si fetchEntities est une fonction
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      });
    },
    [executeOperation]
  );

  // Gestion de la synchronisation
  const handleSyncEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.syncEntity) {
        console.warn("syncEntity n'est pas défini");
        return;
      }

      return executeOperation(async () => {
        await functionsRef.current.syncEntity(id);
        // Rafraîchir seulement si fetchEntities est une fonction
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      });
    },
    [executeOperation]
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

export default useEntityTable;

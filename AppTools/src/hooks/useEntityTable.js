// src/hooks/useEntityTable.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useEntityTable = ({ fetchEntities, deleteEntity, syncEntity }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const operationInProgress = useRef(false);

  const functionsRef = useRef({
    fetchEntities,
    deleteEntity,
    syncEntity,
  });

  useEffect(() => {
    functionsRef.current = { fetchEntities, deleteEntity, syncEntity };
  }, [fetchEntities, deleteEntity, syncEntity]);

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

  const loadEntities = useCallback(() => {
    return executeOperation(async () => {
      if (typeof functionsRef.current.fetchEntities === 'function') {
        await functionsRef.current.fetchEntities();
      }
    });
  }, [executeOperation]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleDeleteEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.deleteEntity) return;

      return executeOperation(async () => {
        await functionsRef.current.deleteEntity(id);
        if (typeof functionsRef.current.fetchEntities === 'function') {
          await functionsRef.current.fetchEntities();
        }
      });
    },
    [executeOperation]
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

  return {
    loading,
    error,
    loadEntities,
    handleDeleteEntity,
    ...(syncEntity && { handleSyncEntity }), // clé conditionnelle
    executeOperation,
    operationInProgress: operationInProgress.current,
  };
};

export default useEntityTable;

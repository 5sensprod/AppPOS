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

  // Référence pour suivre si le composant est monté
  const isMountedRef = useRef(true);

  // Nettoyer la référence au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      // Vérifier si le composant est toujours monté avant de mettre à jour l'état
      if (isMountedRef.current) {
        setError(err.message || `Erreur lors de l'opération`);
      }
      throw err;
    } finally {
      // Vérifier si le composant est toujours monté avant de mettre à jour l'état
      if (isMountedRef.current) {
        setLoading(false);
      }
      operationInProgress.current = false;
    }
  }, []);

  // Fonction pour charger les données avec gestion des erreurs
  const loadEntities = useCallback(() => {
    return executeOperation(async () => {
      await functionsRef.current.fetchEntities();
    });
  }, [executeOperation]);

  // Chargement initial des données
  useEffect(() => {
    // Utiliser une variable pour suivre si l'effet a été exécuté
    let didInitialLoad = false;

    if (!didInitialLoad) {
      didInitialLoad = true;
      loadEntities();
    }

    // Pas de dépendance à loadEntities pour éviter de déclencher à nouveau l'effet
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gestion de la suppression
  const handleDeleteEntity = useCallback(
    async (id) => {
      return executeOperation(async () => {
        await functionsRef.current.deleteEntity(id);
        // Avec WebSockets, ne pas appeler fetchEntities ici
        // Les mises à jour seront déclenchées par les événements WebSocket
      });
    },
    [executeOperation]
  );

  // Gestion de la synchronisation
  const handleSyncEntity = useCallback(
    async (id) => {
      if (!functionsRef.current.syncEntity) return;

      return executeOperation(async () => {
        await functionsRef.current.syncEntity(id);
        // Avec WebSockets, ne pas appeler fetchEntities ici
        // Les mises à jour seront déclenchées par les événements WebSocket
      });
    },
    [executeOperation]
  );

  // Forcer un rechargement des données (utile pour les rafraîchissements manuels)
  const refreshEntities = useCallback(() => {
    return loadEntities();
  }, [loadEntities]);

  return {
    loading,
    error,
    loadEntities,
    refreshEntities,
    handleDeleteEntity,
    handleSyncEntity,
    executeOperation,
    operationInProgress: operationInProgress.current,
  };
};

export default useEntityTable;

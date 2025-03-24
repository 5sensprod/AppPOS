// src/hooks/useEntityWithPreferences.js
import { useEffect } from 'react';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export function useEntityWithPreferences({
  entityType,
  entityStore,
  preferencesStore,
  deleteEntityFn,
  syncEntityFn = null,
}) {
  // Récupérer les données et fonctions du store
  const { data: entities, loading: entitiesLoading, fetchEntities, initWebSocket } = entityStore;

  // Récupérer les préférences
  const {
    preferences: tablePreferences,
    updatePreference: updateTablePreference,
    resetSection: resetPreferenceSection,
  } = preferencesStore;

  // Restaurer la position de défilement
  useScrollRestoration(tablePreferences, entityType);

  // Initialiser WebSocket et charger les données
  useEffect(() => {
    initWebSocket();
    if (entities.length === 0) {
      fetchEntities();
    }
  }, [initWebSocket, fetchEntities, entities.length]);

  // Utiliser le hook useEntityTable
  const {
    loading: operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
  } = useEntityTable({
    entityType,
    fetchEntities,
    deleteEntity: deleteEntityFn,
    syncEntity: syncEntityFn,
  });

  // Gestionnaires pour les préférences
  const handlePreferencesChange = (section, value) => {
    updateTablePreference(section, value);
  };

  const handleResetFilters = () => {
    resetPreferenceSection('search');
  };

  return {
    entities,
    tablePreferences,
    isLoading: entitiesLoading || operationLoading,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  };
}

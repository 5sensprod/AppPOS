// src/hooks/useEntityTableWithPreferences.js
import { useEffect, useState } from 'react';
import { useEntityTable } from '@/hooks/useEntityTable';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export function useEntityTableWithPreferences({
  entityType,
  entityStore,
  preferencesStore,
  deleteEntityFn,
  syncEntityFn = null,
}) {
  // État local pour suivre si la restauration initiale a été effectuée
  const [initialRestoreComplete, setInitialRestoreComplete] = useState(false);

  // Récupérer les données et fonctions du store
  const { data: entities, loading: entitiesLoading, fetchEntities, initWebSocket } = entityStore;

  // Récupérer les préférences
  const {
    preferences: tablePreferences,
    updatePreference: updateTablePreference,
    resetSection: resetPreferenceSection,
  } = preferencesStore;

  // Restaurer la position de défilement avec le hook amélioré
  useScrollRestoration(tablePreferences, entityType);

  // Initialiser WebSocket et charger les données
  useEffect(() => {
    initWebSocket();

    // Ne charger les données que si nécessaire
    if (entities.length === 0) {
      fetchEntities();
    }

    // Marquer l'initialisation comme complète après un délai
    setTimeout(() => {
      if (!initialRestoreComplete) {
        setInitialRestoreComplete(true);
      }
    }, 500);
  }, [initWebSocket, fetchEntities, entities.length, initialRestoreComplete]);

  // Utiliser le hook useEntityTable pour les opérations CRUD
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

  // Gestionnaire amélioré pour les préférences
  const handlePreferencesChange = (section, value) => {
    // Si nous mettons à jour la sélection, sauvegarder également la position de défilement
    if (section === 'selection') {
      const scrollPosition = window.scrollY;

      // S'assurer que la position est sauvegardée à la fois dans selection et detail
      const updatedValue = {
        ...value,
        scrollPosition: scrollPosition,
      };

      // Mettre à jour la section selection
      updateTablePreference(section, updatedValue);

      // Mettre également à jour la section detail pour une compatibilité complète
      updateTablePreference('detail', {
        ...tablePreferences.detail,
        scrollPosition: scrollPosition,
        lastFocusedElementId: value.focusedItemId || tablePreferences.selection.focusedItemId,
      });
    } else {
      // Pour les autres sections, mettre à jour normalement
      updateTablePreference(section, value);
    }
  };

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    resetPreferenceSection('search');
  };

  return {
    entities,
    tablePreferences,
    isLoading: entitiesLoading || operationLoading || !initialRestoreComplete,
    error,
    handleDeleteEntity,
    handleSyncEntity,
    handlePreferencesChange,
    handleResetFilters,
  };
}

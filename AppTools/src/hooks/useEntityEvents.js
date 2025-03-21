// src/hooks/useEntityEvents.js
import { useEffect } from 'react';
import websocketService from '../services/websocketService';

export function useEntityEvents(entityType, handlers = {}) {
  useEffect(() => {
    const cleanupFunctions = [];

    // Standardiser le type d'entité (singulier/pluriel)
    const standardEntityType = entityType.endsWith('s') ? entityType : `${entityType}s`;

    // S'abonner aux événements
    if (handlers.onCreated) {
      websocketService.on(`${standardEntityType}.created`, handlers.onCreated);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.created`, handlers.onCreated)
      );
    }

    if (handlers.onUpdated) {
      websocketService.on(`${standardEntityType}.updated`, handlers.onUpdated);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.updated`, handlers.onUpdated)
      );
    }

    if (handlers.onDeleted) {
      websocketService.on(`${standardEntityType}.deleted`, handlers.onDeleted);
      cleanupFunctions.push(() =>
        websocketService.off(`${standardEntityType}.deleted`, handlers.onDeleted)
      );
    }

    // S'abonner à des événements spécifiques supplémentaires
    if (handlers.customEvents) {
      Object.entries(handlers.customEvents).forEach(([eventName, handler]) => {
        websocketService.on(eventName, handler);
        cleanupFunctions.push(() => websocketService.off(eventName, handler));
      });
    }

    // S'assurer que nous sommes abonnés au type d'entité
    websocketService.subscribe(standardEntityType);

    // Nettoyage
    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [entityType, handlers]);
}

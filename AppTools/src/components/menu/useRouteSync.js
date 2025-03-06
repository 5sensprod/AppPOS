// Ajouter ce hook dans un nouveau fichier src/components/menu/useRouteSync.js

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenu } from './useMenu';

export function useRouteSync() {
  const location = useLocation();
  const { handleRouteChange } = useMenu();

  useEffect(() => {
    // Développer automatiquement le menu qui correspond à la route actuelle
    handleRouteChange(location.pathname);
  }, [location.pathname, handleRouteChange]);

  return null; // Ce hook ne renvoie rien, il effectue juste une action sur le changement de route
}

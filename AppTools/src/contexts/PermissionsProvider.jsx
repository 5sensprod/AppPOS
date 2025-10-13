import React, { createContext, useContext } from 'react';
import { useRolePermissions } from '../hooks/useRolePermissions';

const PermissionsContext = createContext(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const { permissions, loading, error, refreshPermissions } = useRolePermissions();

  return (
    <PermissionsContext.Provider value={{ permissions, loading, error, refreshPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

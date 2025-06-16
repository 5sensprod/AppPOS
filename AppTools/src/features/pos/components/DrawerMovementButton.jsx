// 1. Créer src/features/pos/components/DrawerMovementButton.jsx
import React from 'react';
import { PlusCircle, Wallet } from 'lucide-react';
import { useDrawer } from '../../../stores/sessionStore';

const DrawerMovementButton = () => {
  const { hasOpenDrawer, setShowDrawerMovementModal } = useDrawer();

  if (!hasOpenDrawer) return null;

  return (
    <button
      onClick={() => setShowDrawerMovementModal(true)}
      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
    >
      <PlusCircle className="h-4 w-4" />
      <span>Mouvement</span>
    </button>
  );
};

export default DrawerMovementButton;

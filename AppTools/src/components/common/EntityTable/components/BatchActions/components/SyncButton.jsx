// components/SyncButton.jsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

const SyncButton = ({
  onClick,
  syncStats,
  isSyncing,
  label = 'Synchroniser',
  className = '',
  disabled = false,
}) => {
  const isActive = syncStats?.isActive || false;
  const remaining = syncStats?.remaining || 0;
  const completed = syncStats?.completed || 0;
  const total = syncStats?.total || 0;

  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      className={`
        px-3 py-1 rounded-md flex items-center text-sm 
        bg-blue-100 hover:bg-blue-200 text-blue-800
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
      title={isActive ? `Synchronisation: ${completed}/${total} terminé` : label}
    >
      <RefreshCw
        className={`h-4 w-4 mr-1 transition-transform duration-200 ${
          isActive ? 'animate-spin' : ''
        }`}
      />

      {isActive ? (
        <span className="flex items-center space-x-1">
          <span>{label}</span>
          {total > 1 && (
            <span className="bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded-full text-xs font-medium">
              {remaining}
            </span>
          )}
        </span>
      ) : (
        label
      )}
    </button>
  );
};

export default SyncButton;

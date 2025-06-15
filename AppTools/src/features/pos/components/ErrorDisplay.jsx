// src/features/pos/components/ErrorDisplay.jsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ErrorMessage = ({ message, onClose, type = 'error' }) => {
  const baseClasses = 'mb-4 border px-4 py-3 rounded-lg';
  const typeClasses = {
    error: 'bg-red-100 dark:bg-red-900 border-red-400 text-red-700 dark:text-red-300',
    warning:
      'bg-yellow-100 dark:bg-yellow-900 border-yellow-400 text-yellow-700 dark:text-yellow-300',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <div className="flex justify-between items-center">
        {type === 'warning' && <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />}
        <span className="flex-1">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-2 ${
              type === 'error'
                ? 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
                : 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100'
            }`}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

const ErrorDisplay = ({ cartError, lcdError, onClearCartError }) => {
  return (
    <>
      {/* Erreurs panier */}
      {cartError && <ErrorMessage message={cartError} onClose={onClearCartError} type="error" />}

      {/* Erreurs LCD */}
      {lcdError && <ErrorMessage message={lcdError} type="warning" />}
    </>
  );
};

export default ErrorDisplay;

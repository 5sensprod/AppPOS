// components/Toast.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const Toast = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'progress':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const progressPercentage = toast.progress
    ? (toast.progress.current / toast.progress.total) * 100
    : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border shadow-lg p-4 mb-2
        transform transition-all duration-200 ease-out
        ${getBackgroundColor()}
        ${
          isVisible && !isLeaving
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      {/* Barre de progression pour les toasts de progression */}
      {toast.type === 'progress' && toast.progress && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      )}

      <div className="flex items-start">
        {/* Icône */}
        <div className="flex-shrink-0">{getIcon()}</div>

        {/* Contenu */}
        <div className="ml-3 flex-1">
          {toast.title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {toast.title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">{toast.message}</p>

          {/* Progression détaillée */}
          {toast.type === 'progress' && toast.progress && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {toast.progress.current}/{toast.progress.total}
              {toast.progress.label && ` ${toast.progress.label}`}
            </div>
          )}
        </div>

        {/* Bouton de fermeture */}
        {toast.dismissible && (
          <button
            onClick={handleRemove}
            className="ml-4 flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;

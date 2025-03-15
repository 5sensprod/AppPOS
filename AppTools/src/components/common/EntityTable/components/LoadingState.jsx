import React from 'react';

export const LoadingState = () => {
  return (
    <div className="flex justify-center p-6">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    </div>
  );
};

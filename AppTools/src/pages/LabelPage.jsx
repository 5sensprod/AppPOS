// src/pages/LabelPage.jsx
import React from 'react';

const LabelPage = () => {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestion des Affiches</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Créez et gérez vos affiches et étiquettes personnalisées.
        </p>
      </div>

      {/* Contenu à venir */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Module en développement
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Le module de gestion des affiches sera bientôt disponible.
        </p>
      </div>
    </div>
  );
};

export default LabelPage;

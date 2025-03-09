// src/components/ui/StatusBadge.jsx
import React from 'react';

/**
 * Badge pour afficher des statuts avec différentes couleurs
 */
const StatusBadge = ({ status, statusMap, className = '' }) => {
  // Vérifier si le statut est dans la carte, sinon utiliser une couleur par défaut
  const statusConfig = statusMap[status] || {
    label: status,
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${className}`}
    >
      {statusConfig.label}
    </span>
  );
};

export default StatusBadge;

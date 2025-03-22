// src/components/common/EntityPageHeader.jsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Composant d'en-tête pour les pages d'entités
 *
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.icon - Icône à afficher
 * @param {string} props.title - Titre de la page
 * @param {string} props.description - Description de la page
 * @param {string} props.addButtonLabel - Texte du bouton d'ajout
 * @param {string} props.addButtonPath - Chemin de redirection pour l'ajout
 * @param {Function} props.onAddClick - Fonction à exécuter lors du clic sur le bouton d'ajout (alternative à addButtonPath)
 */
function EntityPageHeader({ icon, title, description, addButtonLabel, addButtonPath, onAddClick }) {
  const navigate = useNavigate();

  const handleAddClick = () => {
    if (onAddClick) {
      onAddClick();
    } else if (addButtonPath) {
      navigate(addButtonPath);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex items-center">
        {icon && <div className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3">{icon}</div>}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {description && <p className="text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
      </div>

      {(addButtonLabel || addButtonPath || onAddClick) && (
        <button
          onClick={handleAddClick}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-5 w-5 mr-2" />
          {addButtonLabel}
        </button>
      )}
    </div>
  );
}

export default EntityPageHeader;

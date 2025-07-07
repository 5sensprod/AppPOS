//AppTools\src\components\common\EntityTable\components\BatchActions\hooks\useClickOutside.js
import { useEffect } from 'react';

export const useClickOutside = (ref, isOpen, onClose, excludeRef = null) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isOpen) return;

      // Vérifier si le clic est à l'intérieur du dropdown
      if (ref.current && ref.current.contains(event.target)) {
        return;
      }

      // Vérifier si le clic est sur le bouton (à exclure)
      if (excludeRef && excludeRef.current && excludeRef.current.contains(event.target)) {
        return;
      }

      // Si le clic est à l'extérieur, fermer le dropdown
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, ref, excludeRef]);
};

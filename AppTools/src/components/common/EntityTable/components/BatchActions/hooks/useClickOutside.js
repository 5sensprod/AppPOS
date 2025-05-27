// hooks/useClickOutside.js
import { useEffect } from 'react';

export const useClickOutside = (ref, isOpen, onClose) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, ref]);
};

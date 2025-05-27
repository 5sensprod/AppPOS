// hooks/useButtonPosition.js
import { useState, useEffect, useRef } from 'react';

export const useButtonPosition = (isOpen) => {
  const buttonRef = useRef(null);
  const [buttonRect, setButtonRect] = useState({ top: 0, left: 0, bottom: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        bottom: rect.bottom + window.scrollY,
        width: rect.width,
      });
    }
  }, [isOpen]);

  return { buttonRef, buttonRect };
};

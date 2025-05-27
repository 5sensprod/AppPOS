// components/MenuPortal.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { useDropdownAnimation } from '../hooks/useDropdownAnimation';

const MenuPortal = ({ isOpen, children, buttonRect }) => {
  const { isVisible, shouldRender } = useDropdownAnimation(isOpen);

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed transition-all duration-200 ease-in-out ${
        isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
      }`}
      style={{
        top: `${buttonRect.bottom}px`,
        left: `${buttonRect.left}px`,
        width: `${Math.max(buttonRect.width, 320)}px`,
        zIndex: 99999,
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default MenuPortal;

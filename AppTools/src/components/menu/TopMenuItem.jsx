// src/components/menu/TopMenuItem.jsx
// Composant pour les éléments du menu supérieur
import React from 'react';
import MenuButton from './MenuButton';

const TopMenuItem = ({ item }) => {
  const { icon, label, onClick, badge, active, disabled, component: CustomComponent } = item;

  // Si un composant personnalisé est fourni, l'utiliser
  if (CustomComponent) {
    return <CustomComponent item={item} />;
  }

  // Sinon, utiliser le bouton de menu standard
  return (
    <MenuButton
      icon={icon}
      label={label}
      onClick={onClick}
      badge={badge}
      active={active}
      disabled={disabled}
      className="mx-1"
    />
  );
};

export default TopMenuItem;

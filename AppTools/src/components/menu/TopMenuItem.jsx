// src/components/menu/TopMenuItem.jsx
import React, { memo } from 'react';
import MenuButton from './MenuButton';

const TopMenuItem = memo(({ item }) => {
  const { icon, label, onClick, badge, active, disabled, component: CustomComponent, id } = item;

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
      data-menu-id={id}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled}
      role="menuitem"
    />
  );
});

export default TopMenuItem;

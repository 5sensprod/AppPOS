// AppTools/src/components/atoms/Select/SelectChip.jsx - AVEC THÈMES
import React from 'react';
import { X, Star } from 'lucide-react';
import { getChipClassName, getThemedClasses } from './selectStyles';

const SelectChip = ({
  children,
  onRemove,
  onPrimary,
  isPrimary = false,
  title,
  removable = true,
  primaryToggle = false,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
  theme = 'default', // ⚡ Support des thèmes
}) => {
  // Tailles
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // ⚡ CHOIX: Utilise les thèmes SI différent de 'default', sinon garde l'ancienne logique
  let chipClassName;

  if (theme === 'default') {
    // ✅ Garde votre logique existante pour le thème par défaut
    chipClassName = getChipClassName(isPrimary, `${sizeClasses[size]} ${className}`);
  } else {
    // ⚡ Utilise les nouveaux thèmes
    const themedClasses = getThemedClasses(theme);
    const baseChipClass = isPrimary ? themedClasses.chipPrimary : themedClasses.chipSecondary;
    chipClassName = `${baseChipClass} ${sizeClasses[size]} ${className}`;
  }

  return (
    <div className={chipClassName} title={title}>
      {/* Icône principale (étoile) */}
      {isPrimary && <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" />}

      {/* Contenu */}
      <span className="mr-2">{children}</span>

      {/* Bouton toggle primary */}
      {primaryToggle && !isPrimary && onPrimary && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrimary();
          }}
          className="mr-1 text-gray-400 hover:text-yellow-500 transition-colors"
          title="Définir comme principal"
        >
          <Star className="h-3 w-3" />
        </button>
      )}

      {/* Bouton supprimer */}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Supprimer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default SelectChip;

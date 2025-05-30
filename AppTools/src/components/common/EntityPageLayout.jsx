// src/components/common/EntityPageLayout.jsx
import React from 'react';
import EntityPageHeader from './EntityPageHeader';

/**
 * Layout standard pour les pages d'entités
 *
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.icon - Icône à afficher dans l'en-tête
 * @param {string} props.title - Titre de la page
 * @param {string} props.description - Description de la page
 * @param {string} props.addButtonLabel - Texte du bouton d'ajout
 * @param {string} props.addButtonPath - Chemin de redirection pour l'ajout
 * @param {Function} props.onAddClick - Fonction à exécuter lors du clic sur le bouton d'ajout
 * @param {React.ReactNode} props.children - Contenu de la page
 * @param {React.ReactNode} props.provider - Provider de contexte à utiliser
 * @param {React.ReactElement} props.contentComponent - Composant principal (comme un tableau)
 */
function EntityPageLayout({
  icon,
  title,
  description,
  addButtonLabel,
  addButtonPath,
  onAddClick,
  children,
  provider: Provider,
  contentComponent: ContentComponent,
}) {
  const content = (
    <div className="container mx-auto px-4 ">
      <EntityPageHeader
        icon={icon}
        title={title}
        description={description}
        addButtonLabel={addButtonLabel}
        addButtonPath={addButtonPath}
        onAddClick={onAddClick}
      />

      {/* Contenu principal (généralement un tableau) */}
      {ContentComponent && <ContentComponent />}

      {/* Contenu supplémentaire si nécessaire */}
      {children}
    </div>
  );

  // Envelopper dans le provider si fourni
  if (Provider) {
    return <Provider>{content}</Provider>;
  }

  return content;
}

export default EntityPageLayout;

// src/components/common/tabs/ImagesTab.jsx
import React from 'react';
import EntityImageManager from '../EntityImageManager';

const ImagesTab = ({
  entity,
  entityId,
  entityType,
  galleryMode = false,
  onUploadImage,
  onDeleteImage,
  onSetMainImage,
  isLoading,
  error,
  // Ajout de la prop editable
  editable = false,
}) => {
  // Passez simplement toutes les props à EntityImageManager, y compris editable
  return (
    <EntityImageManager
      entity={entity}
      entityId={entityId}
      entityType={entityType}
      galleryMode={galleryMode}
      onUploadImage={onUploadImage}
      onDeleteImage={onDeleteImage}
      onSetMainImage={onSetMainImage}
      isLoading={isLoading}
      error={error}
      editable={editable}
    />
  );
};

export default ImagesTab;

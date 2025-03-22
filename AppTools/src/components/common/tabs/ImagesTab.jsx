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
}) => {
  // Passez simplement toutes les props à EntityImageManager
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
    />
  );
};

export default ImagesTab;

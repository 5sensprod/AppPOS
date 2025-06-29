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
  ...formProps
}) => {
  // Passez simplement toutes les props à EntityImageManager, y compris editable
  const effectiveUploadHandler = formProps.onUploadImage || onUploadImage;
  const effectiveDeleteHandler = formProps.onDeleteImage || onDeleteImage;
  return (
    <EntityImageManager
      entity={entity}
      entityId={entityId}
      entityType={entityType}
      galleryMode={galleryMode}
      onUploadImage={effectiveUploadHandler}
      onDeleteImage={effectiveDeleteHandler}
      onSetMainImage={onSetMainImage}
      isLoading={isLoading}
      error={error}
      editable={editable}
    />
  );
};

export default ImagesTab;

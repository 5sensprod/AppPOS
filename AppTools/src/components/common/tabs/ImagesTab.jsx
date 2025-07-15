// src/components/common/tabs/ImagesTab.jsx
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header harmonisé */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
          <div className="flex items-center">
            <ImageIcon className="h-5 w-5 mr-2" />
            <span>Gestion des images</span>
          </div>
        </h2>

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
      </div>
    </div>
  );
};

export default ImagesTab;

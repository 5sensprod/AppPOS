// src/components/atoms/ImageDisplay.jsx
import React, { useState } from 'react';
import { X, Image as ImageIcon, Trash, Star } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

const ImageDisplay = ({
  image,
  alt = 'Image',
  size = 'medium', // 'small', 'medium', 'large'
  editable = false,
  onDelete,
  onSetMain,
  showInfo = true,
  className = '',
  isMain = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getImageSize = (img) => {
    return img?.size || img?.metadata?.size || null;
  };

  const getImageDimensions = (img) => {
    if (img?.width && img?.height) {
      return { width: img.width, height: img.height };
    }
    if (img?.metadata?.width && img?.metadata?.height) {
      return { width: img.metadata.width, height: img.metadata.height };
    }
    return null;
  };

  const getImageUrl = (src) => {
    console.log('🖼️ [ImageDisplay] Debug:', {
      src,
      serviceApiBaseUrl: imageProxyService?.apiBaseUrl,
      serviceInitialized: !!imageProxyService?.apiBaseUrl,
    });

    if (!src) return null;

    try {
      const result = imageProxyService.getImageUrl(src);
      console.log('🖼️ [ImageDisplay] URL générée:', result);
      return result;
    } catch (error) {
      console.error('🖼️ [ImageDisplay] Erreur:', error);
      return src; // Fallback
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Supprimer cette image ?')) {
      onDelete?.();
    }
  };

  const handleSetMain = (e) => {
    e.stopPropagation();
    onSetMain?.();
  };

  if (!image?.src || imageError) {
    return (
      <div
        className={`
        ${sizeClasses[size]} 
        bg-gray-100 dark:bg-gray-700 rounded-lg 
        flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600
        ${className}
      `}
      >
        <div className="text-center text-gray-400">
          <ImageIcon className="h-8 w-8 mx-auto mb-1" />
          <span className="text-xs">Aucune image</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Badge image principale */}
      {isMain && (
        <div className="absolute top-1 left-1 z-20 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <Star className="h-3 w-3 mr-1" />
          Principal
        </div>
      )}

      {/* Container de l'image */}
      <div
        className={`
        ${sizeClasses[size]} 
        bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border
        flex flex-col
      `}
      >
        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-1">
          <img
            src={getImageUrl(image.src)}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>

        {/* Informations de l'image */}
        {showInfo && size !== 'small' && (
          <div className="p-1 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 text-center border-t">
            {getImageSize(image) && <div>{formatFileSize(getImageSize(image))}</div>}
            {getImageDimensions(image) && (
              <div>
                {getImageDimensions(image).width} × {getImageDimensions(image).height}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions en mode édition */}
      {editable && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
          <div className="flex space-x-2">
            {onSetMain && !isMain && (
              <button
                onClick={handleSetMain}
                className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                title="Définir comme principale"
              >
                <Star className="h-4 w-4" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Supprimer"
              >
                <Trash className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;

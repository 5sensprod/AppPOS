// src/components/common/EntityImageManager.jsx
import React, { useState } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  Image as ImageIcon,
  RefreshCw,
  Trash,
  Plus,
  FileImage,
  Camera,
} from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

// Fonctions utilitaires existantes
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return null;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getImageSize = (image) => {
  if (!image) return null;
  if (image.size) return image.size;
  if (image.metadata && image.metadata.size) return image.metadata.size;
  return null;
};

const getImageDimensions = (image) => {
  if (!image) return null;

  // Vérifier d'abord si les dimensions sont directement sur l'objet image
  if (image.width && image.height) {
    return { width: image.width, height: image.height };
  }

  // Vérifier dans metadata.dimensions (structure de votre API)
  if (image.metadata && image.metadata.dimensions) {
    const { width, height } = image.metadata.dimensions;
    if (width && height) {
      return { width, height };
    }
  }

  // Fallback : vérifier directement dans metadata (pour compatibilité)
  if (image.metadata) {
    if (image.metadata.width && image.metadata.height) {
      return { width: image.metadata.width, height: image.metadata.height };
    }
  }

  return null;
};

// Fonction pour valider les dimensions d'une image
const validateImageDimensions = (file, minWidth = 800, minHeight = 800) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width < minWidth || img.height < minHeight) {
        reject(
          new Error(
            `L'image doit faire au minimum ${minWidth}x${minHeight} pixels. Dimensions actuelles: ${img.width}x${img.height} pixels.`
          )
        );
      } else {
        resolve({ width: img.width, height: img.height });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire les dimensions de l'image."));
    };

    img.src = url;
  });
};

const EntityImageManager = ({
  entity,
  entityId,
  entityType,
  galleryMode = false,
  maxImages = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 5 * 1024 * 1024,
  minWidth = 800,
  minHeight = 800,
  onUploadImage,
  onDeleteImage,
  onSetMainImage,
  isLoading = false,
  error = null,
  editable = false,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const mainImage = entity?.image;
  const galleryImages = entity?.gallery_images || [];

  const validateFile = async (file) => {
    // Validation du type de fichier
    if (!acceptedTypes.includes(file.type)) {
      throw new Error(
        `Type de fichier non supporté. Types acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`
      );
    }

    // Validation de la taille du fichier
    if (file.size > maxFileSize) {
      throw new Error(
        `Fichier trop volumineux. Taille maximale: ${Math.round(maxFileSize / 1024 / 1024)}Mo`
      );
    }

    // Validation des dimensions
    await validateImageDimensions(file, minWidth, minHeight);
  };

  const handleMainImageUpload = async (e) => {
    if (!editable) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploadError(null);
    setUploadProgress(10);

    try {
      // Validation complète du fichier
      await validateFile(file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) =>
          prev >= 90 ? (clearInterval(progressInterval), 90) : prev + 10
        );
      }, 300);

      await onUploadImage(entityId, file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => setUploadProgress(0), 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image :", error);
      setUploadError(error.message);
      setUploadProgress(0);
    }
  };

  const handleGalleryImageUpload = async (e) => {
    if (!editable) return;
    const file = e.target.files[0];
    if (!file) return;

    if (galleryImages.length >= maxImages) {
      setUploadError(`Nombre maximum d'images atteint (${maxImages})`);
      return;
    }

    setUploadError(null);
    setUploadProgress(10);

    try {
      // Validation complète du fichier
      await validateFile(file);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) =>
          prev >= 90 ? (clearInterval(progressInterval), 90) : prev + 10
        );
      }, 300);

      await onUploadImage(entityId, file, true);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image de galerie :", error);
      setUploadError(error.message);
      setUploadProgress(0);
    }
  };

  const handleSetMainImage = async (index) => {
    if (!editable || !onSetMainImage) return;

    try {
      await onSetMainImage(entityId, index);
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale :", error);
    }
  };

  const handleDeleteMainImage = async () => {
    if (!editable) return;

    try {
      await onDeleteImage(entityId);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image :", error);
    }
  };

  const handleDeleteGalleryImage = async (index) => {
    if (!editable) return;

    try {
      await onDeleteImage(entityId, index, true);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image de galerie :", error);
    }
  };

  const getImageUrl = (src) => (src ? imageProxyService.getImageUrl(src) : null);

  const renderContent = () => {
    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
          <h2 className="text-red-800 dark:text-red-200 text-lg font-medium mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      );
    }

    if (galleryMode) {
      return (
        <div className="space-y-8">
          {/* Section Image principale */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              <Camera className="inline h-4 w-4 mr-1" />
              Image principale
            </h3>

            <div className="flex flex-col items-center">
              <div className="w-full max-w-md">
                {mainImage?.src ? (
                  <div className="relative bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                    <img
                      src={getImageUrl(mainImage.src)}
                      alt={entityType}
                      className="w-full h-48 object-contain rounded"
                    />
                    {editable && (
                      <button
                        onClick={handleDeleteMainImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                        title="Supprimer l'image"
                        disabled={isLoading}
                      >
                        <X size={16} />
                      </button>
                    )}
                    {/* Métadonnées de l'image */}
                    {(getImageSize(mainImage) || getImageDimensions(mainImage)) && (
                      <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        {getImageSize(mainImage) && (
                          <div>{formatFileSize(getImageSize(mainImage))}</div>
                        )}
                        {getImageDimensions(mainImage) && (
                          <div>
                            {getImageDimensions(mainImage).width} ×{' '}
                            {getImageDimensions(mainImage).height} px
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // État vide harmonisé
                  <div className="px-4 py-8 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400 italic">
                        Aucune image principale
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Zone d'upload */}
              {editable && (
                <div className="mt-4 w-full max-w-md">
                  <div className="relative">
                    <input
                      type="file"
                      accept={acceptedTypes.join(',')}
                      onChange={handleMainImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                    <button
                      className={`w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Upload size={16} className="mr-2" />
                      )}
                      {isLoading ? 'Téléchargement...' : 'Télécharger une image'}
                    </button>
                  </div>

                  {/* Barre de progression harmonisée */}
                  {uploadProgress > 0 && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section Galerie */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              <FileImage className="inline h-4 w-4 mr-1" />
              Galerie d'images
              <span className="text-xs font-normal text-gray-400 ml-2">
                ({galleryImages.length}/{maxImages})
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryImages.length > 0 ? (
                galleryImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                      <div className="aspect-square">
                        <img
                          src={getImageUrl(image.src)}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Métadonnées */}
                      {(getImageSize(image) || getImageDimensions(image)) && (
                        <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400">
                          {getImageSize(image) && <div>{formatFileSize(getImageSize(image))}</div>}
                          {getImageDimensions(image) && (
                            <div>
                              {getImageDimensions(image).width} × {getImageDimensions(image).height}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions en overlay */}
                    {editable && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSetMainImage(index)}
                            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                            title="Définir comme image principale"
                            disabled={isLoading}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteGalleryImage(index)}
                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="Supprimer l'image"
                            disabled={isLoading}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center">
                  <div className="px-4 py-6 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                    <FileImage className="mx-auto h-8 w-8 text-gray-400" />
                    <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400 italic">
                      Aucune image dans la galerie
                    </span>
                  </div>
                </div>
              )}

              {/* Zone d'ajout d'image */}
              {editable && galleryImages.length < maxImages && (
                <div className="relative group">
                  <div className="aspect-square bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer">
                    <Plus size={24} />
                    <span className="mt-1 text-xs font-medium">Ajouter</span>
                    <input
                      type="file"
                      accept={acceptedTypes.join(',')}
                      onChange={handleGalleryImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Mode image simple
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            <Camera className="inline h-4 w-4 mr-1" />
            Image principale
          </h3>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              {mainImage?.src ? (
                <div className="relative bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                  <img
                    src={getImageUrl(mainImage.src)}
                    alt={entityType}
                    className="w-full h-48 object-contain rounded"
                  />
                  {editable && (
                    <button
                      onClick={handleDeleteMainImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                      title="Supprimer l'image"
                      disabled={isLoading}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="px-4 py-8 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <span className="mt-2 block text-sm text-gray-500 dark:text-gray-400 italic">
                      Aucune image
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="md:w-2/3 space-y-4">
              {/* Informations sur l'image */}
              {mainImage && (getImageSize(mainImage) || getImageDimensions(mainImage)) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Détails de l'image
                  </h4>
                  <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                    {getImageSize(mainImage) && (
                      <div>Taille: {formatFileSize(getImageSize(mainImage))}</div>
                    )}
                    {getImageDimensions(mainImage) && (
                      <div>
                        Dimensions: {getImageDimensions(mainImage).width} ×{' '}
                        {getImageDimensions(mainImage).height} px
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contraintes mises à jour */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <strong>Formats acceptés:</strong>{' '}
                  {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')}
                </div>
                <div>
                  <strong>Taille maximum:</strong> {Math.round(maxFileSize / 1024 / 1024)} Mo
                </div>
                <div>
                  <strong>Dimensions minimales:</strong> {minWidth}x{minHeight} pixels
                </div>
              </div>

              {/* Zone d'upload */}
              {editable && (
                <div className="relative">
                  <input
                    type="file"
                    accept={acceptedTypes.join(',')}
                    onChange={handleMainImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                  />
                  <button
                    className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw size={18} className="mr-2 animate-spin" />
                    ) : (
                      <Upload size={18} className="mr-2" />
                    )}
                    {isLoading ? 'Téléchargement en cours...' : 'Choisir une image'}
                  </button>
                </div>
              )}

              {/* Barre de progression */}
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Messages d'erreur globaux
  if (uploadError) {
    return (
      <div>
        {renderContent()}
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="text-sm text-red-600 dark:text-red-400">{uploadError}</div>
        </div>
      </div>
    );
  }

  return renderContent();
};

export default EntityImageManager;

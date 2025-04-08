import React, { useState } from 'react';
import { Upload, X, CheckCircle, Image as ImageIcon, RefreshCw, Trash, Plus } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

const EntityImageManager = ({
  entity,
  entityId,
  entityType,
  galleryMode = false,
  maxImages = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 5 * 1024 * 1024,
  onUploadImage,
  onDeleteImage,
  onSetMainImage,
  isLoading = false,
  error = null,
  editable = false,
  featuredImageOnTop = false,
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const mainImage = entity?.image;
  const galleryImages = entity?.gallery_images || [];

  const handleGalleryImageUpload = async (e) => {
    if (!editable) return;
    const file = e.target.files[0];
    if (!file) return;

    if (!acceptedTypes.includes(file.type)) {
      setUploadError(
        `Type de fichier non supporté. Types acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`
      );
      return;
    }

    if (file.size > maxFileSize) {
      setUploadError(
        `Fichier trop volumineux. Taille maximale: ${Math.round(maxFileSize / 1024 / 1024)}Mo`
      );
      return;
    }

    if (galleryImages.length >= maxImages) {
      setUploadError(`Nombre maximum d'images atteint (${maxImages})`);
      return;
    }

    setUploadError(null);
    setUploadProgress(10);

    try {
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
      setUploadError(error.message || "Erreur lors du téléchargement de l'image");
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
    if (!editable || !window.confirm("Êtes-vous sûr de vouloir supprimer l'image principale ?"))
      return;

    try {
      await onDeleteImage(entityId);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image :", error);
    }
  };

  const handleDeleteGalleryImage = async (index) => {
    if (!editable || !window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

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
        <div className="space-y-6">
          {/* Section Image Principale */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Image principale
            </h2>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 w-full">
              {mainImage?.src ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={getImageUrl(mainImage.src)}
                    alt={entityType}
                    className="max-w-full max-h-44 object-contain"
                  />
                  {editable && (
                    <button
                      onClick={handleDeleteMainImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                      title="Supprimer l'image"
                      disabled={isLoading}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 py-6">
                  <ImageIcon size={36} />
                  <span className="mt-2 text-xs">Aucune image</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Format : {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')}
              <br />
              Taille maximale : {Math.round(maxFileSize / 1024 / 1024)} Mo
              <br />
              <span className="italic">Utilisez la galerie pour définir l'image principale</span>
            </div>
          </div>

          {/* Section Galerie d'Images - Maintenant en dessous */}
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Galerie d'images
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({galleryImages.length}/{maxImages})
              </span>
            </h2>

            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md min-h-[180px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {galleryImages.length > 0 ? (
                  galleryImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border">
                        <img
                          src={getImageUrl(image.src)}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {editable && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleSetMainImage(index)}
                            className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 mx-1"
                            title="Définir comme image principale"
                            disabled={isLoading}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteGalleryImage(index)}
                            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 mx-1"
                            title="Supprimer l'image"
                            disabled={isLoading}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                    <span className="italic">Aucune image dans la galerie</span>
                  </div>
                )}

                {editable && galleryImages.length < maxImages && (
                  <div className="relative group">
                    <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400">
                      <Plus size={20} />
                      <span className="mt-1 text-xs">Ajouter</span>
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

              {editable && galleryImages.length < maxImages && (
                <div className="relative mt-4">
                  <input
                    type="file"
                    accept={acceptedTypes.join(',')}
                    onChange={handleGalleryImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                  />
                  <button
                    className={`flex items-center px-4 py-2 rounded-lg border ${
                      isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Upload size={16} className="mr-2" />
                    )}
                    {isLoading ? 'Téléchargement...' : 'Ajouter à la galerie'}
                  </button>
                </div>
              )}

              {uploadProgress > 0 && (
                <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {uploadError && (
                <div className="text-sm text-red-600 dark:text-red-400 mt-2">{uploadError}</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Mode image simple (lecture seule incluse)
    return (
      <div className="space-y-6">
        <div className="flex flex-row items-start">
          <div className="w-full">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Image principale
            </h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center">
                {mainImage?.src ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={getImageUrl(mainImage.src)}
                      alt={entityType}
                      className="max-w-full max-h-48 object-contain"
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
                  <div className="flex flex-col items-center justify-center text-gray-400 py-8 w-full">
                    <ImageIcon size={48} />
                    <span className="mt-2 text-sm">Aucune image</span>
                  </div>
                )}
              </div>

              <div className="md:w-2/3">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Format : {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')}
                  <br />
                  Taille maximale : {Math.round(maxFileSize / 1024 / 1024)} Mo
                  {editable && (
                    <>
                      <br />
                      <span className="italic text-xs">
                        Utilisez la galerie pour définir l'image principale
                      </span>
                    </>
                  )}
                </div>

                {uploadProgress > 0 && (
                  <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-4">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {uploadError && (
                  <div className="text-sm text-red-600 dark:text-red-400 mt-2">{uploadError}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default EntityImageManager;

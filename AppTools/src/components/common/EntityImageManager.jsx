// src/components/common/EntityImageManager.jsx
import React, { useState } from 'react';
import { Upload, X, CheckCircle, Image as ImageIcon, RefreshCw, Trash, Plus } from 'lucide-react';
import imageProxyService from '../../services/imageProxyService';

/**
 * Composant générique pour gérer les images d'une entité
 * Supporte à la fois les images uniques et les galeries d'images
 */
const EntityImageManager = ({
  // Données
  entity,
  entityId,
  entityType,
  // Configuration
  galleryMode = false, // true pour galerie, false pour image unique
  maxImages = 10, // Nombre maximum d'images en mode galerie
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFileSize = 5 * 1024 * 1024, // 5Mo par défaut
  // Handlers
  onUploadImage,
  onDeleteImage,
  onSetMainImage, // Pour les galeries uniquement
  // État
  isLoading = false,
  error = null,
}) => {
  // États locaux
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Préparer les images à afficher
  const mainImage = entity?.image;
  const galleryImages = entity?.gallery_images || [];

  // Traitement du téléchargement d'image principale
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du type de fichier
    if (!acceptedTypes.includes(file.type)) {
      setUploadError(
        `Type de fichier non supporté. Types acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`
      );
      return;
    }

    // Validation de la taille du fichier
    if (file.size > maxFileSize) {
      setUploadError(
        `Fichier trop volumineux. Taille maximale: ${Math.round(maxFileSize / 1024 / 1024)}Mo`
      );
      return;
    }

    setUploadError(null);
    setUploadProgress(10);

    try {
      // Simuler une progression
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      await onUploadImage(entityId, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Réinitialiser après un court délai
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image :", error);
      setUploadError(error.message || "Erreur lors du téléchargement de l'image");
      setUploadProgress(0);
    }
  };

  // Traitement du téléchargement d'une image de galerie
  const handleGalleryImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du type de fichier
    if (!acceptedTypes.includes(file.type)) {
      setUploadError(
        `Type de fichier non supporté. Types acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`
      );
      return;
    }

    // Validation de la taille du fichier
    if (file.size > maxFileSize) {
      setUploadError(
        `Fichier trop volumineux. Taille maximale: ${Math.round(maxFileSize / 1024 / 1024)}Mo`
      );
      return;
    }

    // Validation du nombre maximum d'images
    if (galleryImages.length >= maxImages) {
      setUploadError(`Nombre maximum d'images atteint (${maxImages})`);
      return;
    }

    setUploadError(null);
    setUploadProgress(10);

    try {
      // Simuler une progression
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      await onUploadImage(entityId, file, true); // true pour indiquer que c'est une image de galerie

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Réinitialiser après un court délai
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image de galerie :", error);
      setUploadError(error.message || "Erreur lors du téléchargement de l'image");
      setUploadProgress(0);
    }
  };

  // Définir l'image principale
  const handleSetMainImage = async (imageIndex) => {
    if (!onSetMainImage) return;

    try {
      await onSetMainImage(entityId, imageIndex);
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale :", error);
    }
  };

  // Supprimer l'image principale
  const handleDeleteMainImage = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer l'image principale ?")) return;

    try {
      await onDeleteImage(entityId);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image :", error);
    }
  };

  // Supprimer une image de la galerie
  const handleDeleteGalleryImage = async (imageIndex) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

    try {
      await onDeleteImage(entityId, imageIndex, true); // true pour indiquer que c'est une image de galerie
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image de galerie :", error);
    }
  };

  // Obtenir l'URL d'une image via le service de proxy
  const getImageUrl = (imageSrc) => {
    return imageSrc ? imageProxyService.getImageUrl(imageSrc) : null;
  };

  // Fonction de rendu avec structure finale
  // Fonction de rendu harmonisée avec les sections Général et Site WEB
  const renderContent = () => {
    // Gestion des erreurs
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

    // En mode galerie, nous utilisons la même structure que dans les sections Général et Site WEB
    if (galleryMode) {
      return (
        <div className="space-y-6">
          {/* Image principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conteneur d'image - utilise le même format que la section Général */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Image principale
              </h2>

              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 w-full">
                    {mainImage && mainImage.src ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img
                          src={getImageUrl(mainImage.src)}
                          alt={entityType}
                          className="max-w-full max-h-48 object-contain"
                        />
                        <button
                          onClick={handleDeleteMainImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                          title="Supprimer l'image"
                          disabled={isLoading}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                        <ImageIcon size={48} />
                        <span className="mt-2 text-sm">Aucune image</span>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Format : {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')}
                    <br />
                    Taille maximale : {Math.round(maxFileSize / 1024 / 1024)} Mo
                  </div>

                  <div className="relative mt-4">
                    <input
                      type="file"
                      accept={acceptedTypes.join(',')}
                      onChange={handleMainImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                    <button
                      className={`flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
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

                  {uploadProgress > 0 && (
                    <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
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

            {/* Galerie d'images */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Galerie d'images
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({galleryImages.length}/{maxImages})
                </span>
              </h2>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md min-h-[200px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  {galleryImages.length > 0 ? (
                    galleryImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                          <img
                            src={getImageUrl(image.src)}
                            alt={`Image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => handleSetMainImage(index)}
                            className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 mx-1"
                            title="Définir comme image principale"
                            disabled={isLoading}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteGalleryImage(index)}
                            className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 mx-1"
                            title="Supprimer l'image"
                            disabled={isLoading}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
                      <span className="italic">Aucune image dans la galerie</span>
                    </div>
                  )}

                  {/* Ajouter une image à la galerie */}
                  {galleryImages.length < maxImages && (
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

                {galleryImages.length < maxImages && (
                  <div className="relative mt-4">
                    <input
                      type="file"
                      accept={acceptedTypes.join(',')}
                      onChange={handleGalleryImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isLoading}
                    />
                    <button
                      className={`flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
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
              </div>
            </div>
          </div>
        </div>
      );
    }

    // En mode image simple (sans galerie), c'est le cas par défaut
    return (
      <div className="space-y-6">
        <div className="flex flex-row items-start">
          <div className="w-full">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Image principale
            </h2>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center">
                {mainImage && mainImage.src ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={getImageUrl(mainImage.src)}
                      alt={entityType}
                      className="max-w-full max-h-48 object-contain"
                    />
                    <button
                      onClick={handleDeleteMainImage}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                      title="Supprimer l'image"
                      disabled={isLoading}
                    >
                      <X size={16} />
                    </button>
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
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept={acceptedTypes.join(',')}
                    onChange={handleMainImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                  />
                  <button
                    className={`flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
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

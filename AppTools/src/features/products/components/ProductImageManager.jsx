// src/features/products/components/ProductImageManager.jsx
import React, { useState } from 'react';
import { useProductExtras } from '../contexts/productContext';
import { Upload, X, CheckCircle, Image as ImageIcon, RefreshCw } from 'lucide-react';

function ProductImageManager({ product }) {
  const { uploadImage, uploadGalleryImage, deleteImage, deleteGalleryImage, setMainImage } =
    useProductExtras();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Gestion du téléchargement de l'image principale
  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
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

      await uploadImage(product._id, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Réinitialiser après un court délai
      setTimeout(() => {
        setUploadProgress(0);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image :", error);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Gestion du téléchargement d'une image de galerie
  const handleGalleryImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
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

      await uploadGalleryImage(product._id, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Réinitialiser après un court délai
      setTimeout(() => {
        setUploadProgress(0);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Erreur lors du téléchargement de l'image de galerie :", error);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Définir l'image principale
  const handleSetMainImage = async (imageIndex) => {
    try {
      setLoading(true);
      await setMainImage(product._id, imageIndex);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la définition de l'image principale :", error);
      setLoading(false);
    }
  };

  // Supprimer l'image principale
  const handleDeleteMainImage = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer l'image principale ?")) return;

    try {
      setLoading(true);
      await deleteImage(product._id);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image :", error);
      setLoading(false);
    }
  };

  // Supprimer une image de la galerie
  const handleDeleteGalleryImage = async (imageIndex) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) return;

    try {
      setLoading(true);
      await deleteGalleryImage(product._id, imageIndex);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la suppression de l'image de galerie :", error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image principale */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Image principale
        </h3>

        <div className="flex items-start space-x-4">
          <div className="relative flex-shrink-0 w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            {product.image && product.image.src ? (
              <>
                <img
                  src={product.image.src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleDeleteMainImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
                  title="Supprimer l'image"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={48} />
                <span className="mt-2 text-sm">Aucune image</span>
              </div>
            )}
          </div>

          <div className="flex-grow space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Format : JPG, PNG, GIF, WebP
              <br />
              Taille maximale : 5 Mo
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleMainImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              <button
                className={`flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Upload size={16} className="mr-2" />
                )}
                {loading ? 'Téléchargement...' : 'Télécharger une image'}
              </button>
            </div>

            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Galerie d'images */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Galerie d'images
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {product.gallery_images && product.gallery_images.length > 0 ? (
            product.gallery_images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <img
                    src={image.src}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleSetMainImage(index)}
                    className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 mx-1"
                    title="Définir comme image principale"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteGalleryImage(index)}
                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 mx-1"
                    title="Supprimer l'image"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">
              Aucune image dans la galerie
            </div>
          )}
        </div>

        <div className="relative">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleGalleryImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          <button
            className={`flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={16} className="mr-2 animate-spin" />
            ) : (
              <Upload size={16} className="mr-2" />
            )}
            {loading ? 'Téléchargement...' : 'Ajouter à la galerie'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductImageManager;

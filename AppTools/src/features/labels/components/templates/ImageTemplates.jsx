// src/features/labels/components/templates/ImageTemplates.jsx
import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Loader2, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';
import presetImageService from '@services/presetImageService';

const ImageTemplates = ({ selectedProduct }) => {
  const { addElement, elements, selectedId, updateElement } = useLabelStore();
  const [availableImages, setAvailableImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMode, setShowMode] = useState('library'); // 'library' | 'product'

  const selectedElement = elements.find((el) => el.id === selectedId);
  const isImageSelected = selectedElement?.type === 'image';
  const isImageLinked = isImageSelected && selectedElement?.dataBinding === 'product_image';

  // Charger les images au montage
  useEffect(() => {
    loadImages();
  }, []);

  // Auto-switch vers mode produit si une image liée est sélectionnée
  useEffect(() => {
    if (isImageLinked && selectedProduct) {
      setShowMode('product');
    }
  }, [isImageLinked, selectedProduct]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const images = await presetImageService.listImages();
      setAvailableImages(images || []);
    } catch (err) {
      console.error('❌ Erreur chargement images:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🆕 Charger l'image pour obtenir ses dimensions naturelles
   */
  const loadImageDimensions = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        });
      };
      img.onerror = () => {
        resolve({
          naturalWidth: 160,
          naturalHeight: 160,
          aspectRatio: 1,
        });
      };
      img.src = src;
    });
  };

  /**
   * ✅ Ajouter une image au canvas en préservant ses proportions
   */
  const handleAddImage = async (image) => {
    const { aspectRatio } = await loadImageDimensions(image.src);
    const baseWidth = 160;
    const calculatedHeight = Math.round(baseWidth / aspectRatio);

    addElement({
      type: 'image',
      id: undefined,
      x: 50,
      y: 50 + elements.length * 30,
      width: baseWidth,
      height: calculatedHeight,
      src: image.src,
      filename: image.filename,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
      aspectRatio: aspectRatio,
    });
  };

  /**
   * 🆕 Construire la liste des images du produit (image principale + galerie)
   */
  const getProductImages = () => {
    if (!selectedProduct) return [];

    const images = [];

    // Image principale
    if (selectedProduct.image?.src) {
      images.push({
        type: 'main',
        src: selectedProduct.image.src,
        filename: 'Image principale',
        id: 'main',
      });
    }

    // Images de la galerie
    if (Array.isArray(selectedProduct.gallery_images)) {
      selectedProduct.gallery_images.forEach((img, index) => {
        if (img?.src) {
          images.push({
            type: 'gallery',
            src: img.src,
            filename: `Galerie ${index + 1}`,
            id: `gallery-${index}`,
          });
        }
      });
    }

    return images;
  };

  /**
   * 🆕 Mettre à jour l'image sélectionnée avec une image produit
   */
  const handleSelectProductImage = async (productImage) => {
    if (!selectedId || !isImageSelected) return;

    const { aspectRatio } = await loadImageDimensions(productImage.src);
    const baseWidth = selectedElement.width || 160;
    const calculatedHeight = Math.round(baseWidth / aspectRatio);

    updateElement(selectedId, {
      src: productImage.src,
      filename: productImage.filename,
      width: baseWidth,
      height: calculatedHeight,
      aspectRatio: aspectRatio,
    });
  };

  const productImages = getProductImages();

  /**
   * Presets de dimensions prédéfinies
   */
  const presets = [
    { id: 'logo', label: 'Logo', size: '200x200' },
    { id: 'product', label: 'Produit', size: '300x300' },
    { id: 'banner', label: 'Bannière', size: '800x200' },
    { id: 'icon', label: 'Icône', size: '64x64' },
  ];

  // 🖼️ Mode : Images Produit
  if (showMode === 'product' && selectedProduct) {
    return (
      <div className="p-4 space-y-4">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowMode('library')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Bibliothèque
          </button>
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
            <LinkIcon className="h-3 w-3" />
            Mode lié
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start gap-2">
            <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <div className="font-medium mb-1">Images de : {selectedProduct.name}</div>
              <div>Cliquez pour changer l'image de l'élément sélectionné</div>
            </div>
          </div>
        </div>

        {/* Images du produit */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Images disponibles ({productImages.length})
          </h3>

          {productImages.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune image pour ce produit</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {productImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleSelectProductImage(image)}
                  className="group relative aspect-square border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <img
                    src={image.src}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* Badge type */}
                  {image.type === 'main' && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Principale
                    </div>
                  )}

                  {/* Overlay au hover */}
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                      <svg
                        className="h-6 w-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Nom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate" title={image.filename}>
                      {image.filename}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 📚 Mode : Bibliothèque d'images
  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start gap-2">
          <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">Bibliothèque d'images</div>
            <div>
              Cliquez sur une image pour l'ajouter au canvas. Les proportions sont préservées.
            </div>
          </div>
        </div>
      </div>

      {/* Bouton pour voir les images produit */}
      {selectedProduct && isImageLinked && (
        <button
          onClick={() => setShowMode('product')}
          className="w-full p-3 border-2 border-blue-400 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Images du produit
            </span>
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {productImages.length} disponible{productImages.length > 1 ? 's' : ''}
          </span>
        </button>
      )}

      {/* Bibliothèque d'images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Images disponibles ({availableImages.length})
          </h3>
          {!loading && (
            <button
              onClick={loadImages}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Actualiser
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : availableImages.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucune image disponible</p>
            <p className="text-xs text-gray-400 mt-1">
              Utilisez l'outil "Upload" pour ajouter des images
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {availableImages.map((image) => (
              <button
                key={image.filename}
                onClick={() => handleAddImage(image)}
                className="group relative aspect-square border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <img
                  src={image.src}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay au hover */}
                <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                </div>

                {/* Nom du fichier */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs text-white truncate" title={image.filename}>
                    {image.filename}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Formats prédéfinis (pour info) */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          💡 Formats recommandés
        </h3>
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {preset.label}
                  </div>
                  <div className="text-xs text-gray-500">{preset.size}px</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageTemplates;

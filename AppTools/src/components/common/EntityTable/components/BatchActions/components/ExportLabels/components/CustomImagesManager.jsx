// CustomImagesManager.jsx - VERSION CORRIGÉE
import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Upload, Trash2, Copy, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';
import presetImageService from '@services/presetImageService';

const CustomImagesManager = () => {
  const {
    labelStyle,
    currentLayout,
    availableImages,
    loadingImages,
    loadAvailableImages,
    addCustomImage,
    updateCustomImage,
    removeCustomImage,
    duplicateCustomImage,
  } = useLabelExportStore();

  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Charger la bibliothèque au montage
  useEffect(() => {
    loadAvailableImages();
  }, []);

  // Vérifier si on est en mode rouleau
  const isRollMode = currentLayout?.supportType === 'rouleau';

  if (isRollMode) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
        <div className="flex items-start gap-2">
          <ImageIcon className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <div className="font-medium mb-1">Images non disponibles</div>
            <div>Les images personnalisées sont uniquement disponibles en mode A4.</div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 🆕 Calculer les dimensions idéales basées sur le canvas actuel
   */
  const getAutoImageDimensions = () => {
    const canvasWidth = currentLayout?.width || 50;
    const canvasHeight = currentLayout?.height || 50;

    console.log('📐 Canvas actuel:', { canvasWidth, canvasHeight });

    // 90% de la largeur, 70% de la hauteur pour bien remplir
    const calculatedWidth = Math.round(canvasWidth * 0.9);
    const calculatedHeight = Math.round(canvasHeight * 0.7);

    console.log('📏 Dimensions auto calculées:', { calculatedWidth, calculatedHeight });

    return {
      width: calculatedWidth,
      height: calculatedHeight,
    };
  };

  // Gestion de l'upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    try {
      const result = await presetImageService.uploadImages(files);

      if (result.images?.length > 0) {
        // Recharger la bibliothèque
        await loadAvailableImages();

        // 🎯 CORRECTION : Calculer les dimensions AVANT d'ajouter
        const autoDims = getAutoImageDimensions();

        console.log('✅ Upload réussi, ajout avec dimensions:', autoDims);

        // Ajouter automatiquement la première image au preset avec dimensions auto
        if (result.images[0]) {
          addCustomImage({
            src: result.images[0].src,
            filename: result.images[0].filename,
            width: autoDims.width, // ✅ Passer explicitement width
            height: autoDims.height, // ✅ Passer explicitement height
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert("Erreur lors de l'upload des images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Ajouter une image depuis la bibliothèque avec dimensions auto
  const handleAddFromLibrary = (image) => {
    const autoDims = getAutoImageDimensions();

    console.log('📚 Ajout depuis bibliothèque avec dimensions:', autoDims);

    addCustomImage({
      src: image.src,
      filename: image.filename,
      width: autoDims.width, // ✅ Passer explicitement width
      height: autoDims.height, // ✅ Passer explicitement height
    });
    setShowLibrary(false);
  };

  const customImages = labelStyle.customImages || [];
  const autoDims = getAutoImageDimensions();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Images personnalisées
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
          {customImages.length}
        </span>
      </div>

      {/* Info sur les dimensions auto */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
        💡 Les images seront dimensionnées à{' '}
        <strong className="text-blue-700 dark:text-blue-300">
          {autoDims.width}×{autoDims.height}mm
        </strong>{' '}
        (Canvas: {currentLayout?.width}×{currentLayout?.height}mm)
      </div>

      {/* Boutons d'action */}
      <div className="grid grid-cols-2 gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              Upload...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Uploader
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowLibrary(!showLibrary)}
          className="px-3 py-2 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center justify-center gap-2 transition-colors"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Bibliothèque
        </button>
      </div>

      {/* Bibliothèque d'images */}
      {showLibrary && (
        <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Bibliothèque ({availableImages.length})
            </span>
            <button
              type="button"
              onClick={() => setShowLibrary(false)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {loadingImages ? (
            <div className="text-center py-4 text-xs text-gray-500">Chargement...</div>
          ) : availableImages.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">
              Aucune image dans la bibliothèque
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableImages.map((image) => (
                <button
                  key={image.filename}
                  type="button"
                  onClick={() => handleAddFromLibrary(image)}
                  className="aspect-square border-2 border-gray-200 dark:border-gray-600 rounded hover:border-blue-500 dark:hover:border-blue-400 overflow-hidden transition-colors group"
                  title={image.filename}
                >
                  <img
                    src={image.src}
                    alt={image.filename}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Liste des images du preset */}
      {customImages.length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aucune image ajoutée
        </div>
      ) : (
        <div className="space-y-2">
          {customImages.map((image) => (
            <ImageItem
              key={image.id}
              image={image}
              onUpdate={(changes) => updateCustomImage(image.id, changes)}
              onRemove={() => removeCustomImage(image.id)}
              onDuplicate={() => duplicateCustomImage(image.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Composant pour chaque image
const ImageItem = ({ image, onUpdate, onRemove, onDuplicate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2">
        {/* Aperçu miniature */}
        <div className="w-12 h-12 border border-gray-200 dark:border-gray-600 rounded overflow-hidden flex-shrink-0">
          <img
            src={image.src}
            alt={image.filename || 'Image'}
            className="w-full h-full object-cover"
            style={{ opacity: image.opacity || 1 }}
          />
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {image.filename || 'Image'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {image.width}×{image.height}mm
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title={expanded ? 'Réduire' : 'Développer'}
          >
            {expanded ? (
              <Eye className="h-3.5 w-3.5 text-gray-600" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
            title="Dupliquer"
          >
            <Copy className="h-3.5 w-3.5 text-blue-600" />
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </button>
        </div>
      </div>

      {/* Paramètres détaillés */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
          {/* Mode de redimensionnement */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Mode d'affichage
            </label>
            <select
              value={image.fitMode || 'contain'}
              onChange={(e) => onUpdate({ fitMode: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
            >
              <option value="contain">Contenir (proportions préservées)</option>
              <option value="cover">Remplir (peut rogner)</option>
              <option value="stretch">Étirer (peut déformer)</option>
            </select>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {image.fitMode === 'cover' && "⚠️ L'image sera rognée pour remplir l'espace"}
              {image.fitMode === 'stretch' && "⚠️ L'image peut être déformée"}
              {(!image.fitMode || image.fitMode === 'contain') &&
                '✅ Les proportions sont préservées'}
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Largeur (mm)
              </label>
              <input
                type="number"
                value={image.width}
                onChange={(e) => onUpdate({ width: parseFloat(e.target.value) || 10 })}
                min={5}
                max={200}
                step={1}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Hauteur (mm)
              </label>
              <input
                type="number"
                value={image.height}
                onChange={(e) => onUpdate({ height: parseFloat(e.target.value) || 10 })}
                min={5}
                max={200}
                step={1}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Opacité */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Opacité: {Math.round((image.opacity || 1) * 100)}%
            </label>
            <input
              type="range"
              value={image.opacity || 1}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
              min={0.1}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Rotation */}
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Rotation: {image.rotation || 0}°
            </label>
            <input
              type="range"
              value={image.rotation || 0}
              onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
              min={0}
              max={360}
              step={15}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomImagesManager;

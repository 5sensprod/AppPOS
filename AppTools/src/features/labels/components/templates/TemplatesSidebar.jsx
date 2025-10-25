// src/features/labels/components/templates/TemplatesSidebar.jsx
import React, { useState, useEffect } from 'react';
import { FolderOpen, Save, Loader2, Eye, Clock, Plus, Grid3x3 } from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';
import templateService from '@services/templateService';

/**
 * Version compacte du gestionnaire de templates
 * Idéale pour la sidebar latérale
 */
const TemplatesSidebar = ({ stageRef }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Données du store
  const elements = useLabelStore((s) => s.elements);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const sheetSettings = useLabelStore((s) => s.sheetSettings);
  const lockCanvasToSheetCell = useLabelStore((s) => s.lockCanvasToSheetCell);
  const dataSource = useLabelStore((s) => s.dataSource);

  // Actions du store
  const clearCanvas = useLabelStore((s) => s.clearCanvas);
  const setCanvasSize = useLabelStore((s) => s.setCanvasSize);
  const setSheetSettings = useLabelStore((s) => s.setSheetSettings);
  const setLockCanvasToSheetCell = useLabelStore((s) => s.setLockCanvasToSheetCell);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await templateService.listTemplates();
      // Limiter aux 10 plus récents pour la sidebar
      setTemplates(allTemplates.slice(0, 10));
    } catch (error) {
      console.error('❌ Erreur chargement templates:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 💾 Sauvegarde rapide
   */
  const handleQuickSave = async (metadata) => {
    try {
      const thumbnail = await templateService.generateThumbnail(stageRef, {
        width: 300,
        height: 200,
      });

      const templateData = {
        elements,
        canvasSize,
        sheetSettings,
        lockCanvasToSheetCell,
        dataSource,
      };

      await templateService.saveTemplate(templateData, {
        ...metadata,
        thumbnail,
      });

      await loadTemplates();
      setShowSaveModal(false);
      alert('✅ Template sauvegardé !');
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  /**
   * 📂 Chargement rapide
   */
  const handleQuickLoad = async (template) => {
    try {
      if (
        elements.length > 0 &&
        !window.confirm('Charger ce template écrasera votre travail actuel. Continuer ?')
      ) {
        return;
      }

      clearCanvas();

      setTimeout(() => {
        setCanvasSize(template.canvasSize.width, template.canvasSize.height);

        if (template.sheetSettings) {
          setSheetSettings(template.sheetSettings);
        }
        if (template.lockCanvasToSheetCell !== undefined) {
          setLockCanvasToSheetCell(template.lockCanvasToSheetCell);
        }

        template.elements.forEach((el) => {
          useLabelStore.getState().addElement(el);
        });

        alert('✅ Template chargé !');
      }, 100);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
      alert('❌ Erreur lors du chargement');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start gap-2">
          <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <div className="font-medium mb-1">Templates sauvegardés</div>
            <div>Sauvegardez et rechargez vos designs rapidement</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          <Save className="h-4 w-4" />
          Sauvegarder
        </button>

        <button
          onClick={loadTemplates}
          disabled={loading}
          className="p-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
          title="Actualiser"
        >
          <Grid3x3 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Liste des templates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Récents ({templates.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Aucun template</p>
            <button
              onClick={() => setShowSaveModal(true)}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Créer le premier
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleQuickLoad(template)}
                className="w-full group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 transition-all text-left"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-6 w-6 text-gray-300" />
                    </div>
                  )}

                  {/* Overlay au hover */}
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {template.name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(template.updatedAt).toLocaleDateString('fr-FR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de sauvegarde rapide */}
      {showSaveModal && (
        <QuickSaveModal onSave={handleQuickSave} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
};

/**
 * Modal de sauvegarde rapide (version simplifiée)
 */
const QuickSaveModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    onSave({
      name: name.trim(),
      category,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-4">
          <h3 className="text-base font-semibold mb-3">Sauvegarder le template</h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon template"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="custom">Personnalisé</option>
                <option value="product">Produit</option>
                <option value="sheet">Planche</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              >
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TemplatesSidebar;

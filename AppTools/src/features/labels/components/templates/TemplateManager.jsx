// src/features/labels/components/templates/TemplateManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Copy,
  Eye,
  Edit2,
  Search,
  Grid3x3,
  List,
  X,
  Clock,
  Tag,
  Loader2,
} from 'lucide-react';
import useLabelStore from '../../store/useLabelStore';
import templateService from '@services/templateService';

const TemplateManager = ({ stageRef, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Données du store
  const elements = useLabelStore((s) => s.elements);
  const canvasSize = useLabelStore((s) => s.canvasSize);
  const sheetSettings = useLabelStore((s) => s.sheetSettings);
  const lockCanvasToSheetCell = useLabelStore((s) => s.lockCanvasToSheetCell);
  const dataSource = useLabelStore((s) => s.dataSource);

  // Actions du store
  const setElements = useLabelStore((s) => s.addElement);
  const setCanvasSize = useLabelStore((s) => s.setCanvasSize);
  const setSheetSettings = useLabelStore((s) => s.setSheetSettings);
  const setLockCanvasToSheetCell = useLabelStore((s) => s.setLockCanvasToSheetCell);
  const clearCanvas = useLabelStore((s) => s.clearCanvas);

  const fileInputRef = useRef(null);

  // Catégories disponibles
  const categories = [
    { id: 'all', label: 'Tous', icon: Grid3x3 },
    { id: 'custom', label: 'Personnalisés', icon: Edit2 },
    { id: 'product', label: 'Produits', icon: Tag },
    { id: 'sheet', label: 'Planches', icon: Grid3x3 },
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  /**
   * 📋 Charge tous les templates
   */
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await templateService.listTemplates();
      setTemplates(allTemplates);
    } catch (error) {
      console.error('❌ Erreur chargement templates:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 💾 Sauvegarde le template actuel
   */
  const handleSaveTemplate = async (metadata) => {
    try {
      // Générer une miniature
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
   * 📂 Charge un template
   */
  const handleLoadTemplate = async (template) => {
    try {
      if (
        elements.length > 0 &&
        !window.confirm('Charger ce template écrasera votre travail actuel. Continuer ?')
      ) {
        return;
      }

      // Vider le canvas
      clearCanvas();

      // Attendre un peu pour que le clear soit effectif
      setTimeout(() => {
        // Restaurer la taille du canvas
        setCanvasSize(template.canvasSize.width, template.canvasSize.height);

        // Restaurer les paramètres de planche
        if (template.sheetSettings) {
          setSheetSettings(template.sheetSettings);
        }
        if (template.lockCanvasToSheetCell !== undefined) {
          setLockCanvasToSheetCell(template.lockCanvasToSheetCell);
        }

        // Restaurer les éléments
        template.elements.forEach((el) => {
          // Utiliser addElement du store pour chaque élément
          useLabelStore.getState().addElement(el);
        });

        alert('✅ Template chargé !');
        if (onClose) onClose();
      }, 100);
    } catch (error) {
      console.error('❌ Erreur chargement template:', error);
      alert('❌ Erreur lors du chargement');
    }
  };

  /**
   * 🗑️ Supprime un template
   */
  const handleDeleteTemplate = async (id, name) => {
    if (!window.confirm(`Supprimer le template "${name}" ?`)) return;

    try {
      await templateService.deleteTemplate(id);
      await loadTemplates();
      alert('✅ Template supprimé');
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  /**
   * 🔄 Duplique un template
   */
  const handleDuplicateTemplate = async (id) => {
    try {
      await templateService.duplicateTemplate(id);
      await loadTemplates();
      alert('✅ Template dupliqué');
    } catch (error) {
      console.error('❌ Erreur duplication:', error);
      alert('❌ Erreur lors de la duplication');
    }
  };

  /**
   * 📤 Exporte un template
   */
  const handleExportTemplate = async (id) => {
    try {
      await templateService.exportTemplate(id);
    } catch (error) {
      console.error('❌ Erreur export:', error);
      alert("❌ Erreur lors de l'export");
    }
  };

  /**
   * 📥 Importe un template
   */
  const handleImportTemplate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await templateService.importTemplate(file);
      await loadTemplates();
      alert('✅ Template importé');
    } catch (error) {
      console.error('❌ Erreur import:', error);
      alert("❌ Erreur lors de l'import");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filtrage des templates
  const filteredTemplates = templates.filter((template) => {
    // Filtre par catégorie
    if (selectedCategory !== 'all' && template.category !== selectedCategory) {
      return false;
    }

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mes Templates</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Actions rapides */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          <Save className="h-4 w-4" />
          Sauvegarder actuel
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm"
        >
          <Upload className="h-4 w-4" />
          Importer
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportTemplate}
          className="hidden"
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="space-y-3">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un template..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Catégories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded whitespace-nowrap text-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste des templates */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {templates.length === 0
              ? 'Aucun template sauvegardé'
              : 'Aucun template trouvé avec ces filtres'}
          </p>
          <button
            onClick={() => setShowSaveModal(true)}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
          >
            Créer mon premier template
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}>
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              viewMode={viewMode}
              onLoad={() => handleLoadTemplate(template)}
              onDelete={() => handleDeleteTemplate(template.id, template.name)}
              onDuplicate={() => handleDuplicateTemplate(template.id)}
              onExport={() => handleExportTemplate(template.id)}
              onEdit={() => setEditingTemplate(template)}
            />
          ))}
        </div>
      )}

      {/* Modal de sauvegarde */}
      {showSaveModal && (
        <SaveTemplateModal onSave={handleSaveTemplate} onClose={() => setShowSaveModal(false)} />
      )}

      {/* Modal d'édition */}
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onSave={async (updates) => {
            await templateService.updateTemplate(editingTemplate.id, updates);
            await loadTemplates();
            setEditingTemplate(null);
          }}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
};

/**
 * 🃏 Carte de template
 */
const TemplateCard = ({ template, viewMode, onLoad, onDelete, onDuplicate, onExport, onEdit }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 transition-all">
        {/* Thumbnail */}
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-20 h-14 object-cover rounded border border-gray-200"
          />
        ) : (
          <div className="w-20 h-14 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-gray-400" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {template.name}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3" />
            {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
            <span className="text-gray-400">•</span>
            <span>{template.elements?.length || 0} éléments</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onLoad}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600"
            title="Charger"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Éditer"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onExport}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Exporter"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Mode grille
  return (
    <div className="group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all">
      {/* Preview */}
      <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={onLoad}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-blue-50"
            title="Charger"
          >
            <FolderOpen className="h-5 w-5 text-blue-600" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
            title="Éditer"
          >
            <Edit2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {template.name}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <Clock className="h-3 w-3" />
          {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
        </div>

        {/* Actions secondaires */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Copy className="h-3 w-3" />
            Dupliquer
          </button>
          <button
            onClick={onExport}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <Download className="h-3 w-3" />
            Exporter
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-xs hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 💾 Modal de sauvegarde
 */
const SaveTemplateModal = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [tags, setTags] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Sauvegarder le template</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon super template"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du template..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="custom">Personnalisé</option>
                <option value="product">Produit</option>
                <option value="sheet">Planche</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="étiquette, prix, promo"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Sauvegarder
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
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

/**
 * ✏️ Modal d'édition
 */
const EditTemplateModal = ({ template, onSave, onClose }) => {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [category, setCategory] = useState(template.category);
  const [tags, setTags] = useState((template.tags || []).join(', '));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Le nom est obligatoire');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Éditer le template</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="custom">Personnalisé</option>
                <option value="product">Produit</option>
                <option value="sheet">Planche</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tags (séparés par des virgules)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
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

export default TemplateManager;

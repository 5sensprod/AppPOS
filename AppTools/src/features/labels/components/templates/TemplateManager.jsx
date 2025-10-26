// src/features/labels/components/templates/TemplateManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  Copy,
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

// ✅ Ajouts : toasts + confirm (versions utilisateur existantes)
import { useActionToasts } from '../../../../components/common/EntityTable/components/BatchActions/hooks/useActionToasts';
import { useConfirmModal } from '../../../../components/hooks/useConfirmModal';

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
  const setCanvasSize = useLabelStore((s) => s.setCanvasSize);
  const setSheetSettings = useLabelStore((s) => s.setSheetSettings);
  const setLockCanvasToSheetCell = useLabelStore((s) => s.setLockCanvasToSheetCell);
  const clearCanvas = useLabelStore((s) => s.clearCanvas);

  const fileInputRef = useRef(null);

  // ✅ Toaster & Confirm (tes hooks)
  const { success, error } = useActionToasts();
  const { confirm, ConfirmModal } = useConfirmModal();

  // Catégories disponibles
  const categories = [
    { id: 'all', label: 'Tous', icon: Grid3x3 },
    { id: 'custom', label: 'Personnalisés', icon: Edit2 },
    { id: 'product', label: 'Produits', icon: Tag },
    { id: 'sheet', label: 'Planches', icon: Grid3x3 },
  ];

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 📋 Charge tous les templates
   */
  const loadTemplates = async () => {
    setLoading(true);
    try {
      const allTemplates = await templateService.listTemplates();
      setTemplates(allTemplates);
    } catch (err) {
      console.error('❌ Erreur chargement templates:', err);
      error('Impossible de charger les templates', { title: 'Erreur' });
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
      success('Template sauvegardé ✅', { title: 'Succès' });
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      error('Erreur lors de la sauvegarde ❌', { title: 'Erreur' });
    }
  };

  /**
   * 📂 Charge un template
   */
  const handleLoadTemplate = async (template) => {
    try {
      if (elements.length > 0) {
        const ok = await confirm({
          title: 'Charger le template ?',
          message: 'Charger ce template écrasera votre travail actuel.',
          confirmText: 'Charger',
          cancelText: 'Annuler',
          variant: 'primary',
        });
        if (!ok) return;
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

        success('Template chargé ✅', { title: 'Succès' });
        if (onClose) onClose();
      }, 100);
    } catch (err) {
      console.error('❌ Erreur chargement template:', err);
      error('Erreur lors du chargement ❌', { title: 'Erreur' });
    }
  };

  /**
   * 🗑️ Supprime un template
   */
  const handleDeleteTemplate = async (id, name) => {
    const ok = await confirm({
      title: 'Supprimer le template ?',
      message: `Cette action est irréversible.\nTemplate : "${name}"`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await templateService.deleteTemplate(id);
      await loadTemplates();
      success('Template supprimé ✅', { title: 'Succès' });
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      error('Erreur lors de la suppression ❌', { title: 'Erreur' });
    }
  };

  /**
   * 🔄 Duplique un template
   */
  const handleDuplicateTemplate = async (id) => {
    try {
      await templateService.duplicateTemplate(id);
      await loadTemplates();
      success('Template dupliqué ✅', { title: 'Succès' });
    } catch (err) {
      console.error('❌ Erreur duplication:', err);
      error('Erreur lors de la duplication ❌', { title: 'Erreur' });
    }
  };

  /**
   * 📤 Exporte un template
   */
  const handleExportTemplate = async (id) => {
    try {
      await templateService.exportTemplate(id);
      success('Export démarré', { title: 'Info' });
    } catch (err) {
      console.error('❌ Erreur export:', err);
      error("Erreur lors de l'export ❌", { title: 'Erreur' });
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
      success('Template importé ✅', { title: 'Succès' });
    } catch (err) {
      console.error('❌ Erreur import:', err);
      error("Erreur lors de l'import ❌", { title: 'Erreur' });
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
            try {
              await templateService.updateTemplate(editingTemplate.id, updates);
              await loadTemplates();
              setEditingTemplate(null);
              success('Template mis à jour ✅', { title: 'Succès' });
            } catch (err) {
              console.error('❌ Erreur update:', err);
              error('Erreur lors de la mise à jour ❌', { title: 'Erreur' });
            }
          }}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {/* ✅ Modal de confirmation (pilotée par useConfirmModal) */}
      <ConfirmModal />
    </div>
  );
};

/**
 * 🃏 Carte de template
 */
const TemplateCard = ({ template, viewMode, onLoad, onDelete, onDuplicate, onExport, onEdit }) => {
  const actionBtn =
    'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0';

  // handler commun (clic + clavier)
  const activate = (e) => {
    // éviter de déclencher si on clique un bouton d’action
    if (e.target.closest('[data-action]')) return;
    onLoad();
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLoad();
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={onKey}
        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-0"
        title={`Ouvrir ${template.name}`}
      >
        {/* Thumbnail */}
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt=""
            className="w-16 h-12 object-cover rounded border border-gray-200 dark:border-gray-700 shrink-0"
          />
        ) : (
          <div className="w-16 h-12 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
            <FolderOpen className="h-5 w-5 text-gray-400" />
          </div>
        )}

        {/* Infos (truncate) */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {template.name}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 mt-1 whitespace-nowrap overflow-hidden">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
            </span>
            <span className="text-gray-400">•</span>
            <span className="truncate">{template.elements?.length || 0} éléments</span>
          </div>
        </div>

        {/* Actions (icônes uniquement) */}
        <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button data-action onClick={onEdit} className={actionBtn} title="Éditer">
            <Edit2 className="h-4 w-4" />
          </button>
          <button data-action onClick={onDuplicate} className={actionBtn} title="Dupliquer">
            <Copy className="h-4 w-4" />
          </button>
          <button data-action onClick={onExport} className={actionBtn} title="Exporter">
            <Download className="h-4 w-4" />
          </button>
          <button
            data-action
            onClick={onDelete}
            className={`${actionBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40`}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- MODE GRILLE (card compacte, pas d’overlay, actions en bas uniquement) ---
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={onKey}
      className="group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
      title={`Ouvrir ${template.name}`}
    >
      {/* Preview */}
      <div
        className="relative w-full overflow-hidden rounded-t-lg bg-white"
        style={{ aspectRatio: '16 / 9' }} // ou '1 / 1' si tu préfères carré
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FolderOpen className="h-10 w-10 text-gray-300" />
          </div>
        )}
      </div>

      {/* Infos + actions */}
      <div className="p-3 min-w-0">
        <div
          className="font-medium text-sm text-gray-900 dark:text-white truncate"
          title={template.name}
        >
          {template.name}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 whitespace-nowrap overflow-hidden">
          <Clock className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {new Date(template.updatedAt).toLocaleDateString('fr-FR')}
          </span>
        </div>

        {/* Barre d’actions compacte (icônes seulement) */}
        <div
          className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button data-action onClick={onEdit} className={actionBtn} title="Éditer">
            <Edit2 className="h-4 w-4" />
          </button>
          <button data-action onClick={onDuplicate} className={actionBtn} title="Dupliquer">
            <Copy className="h-4 w-4" />
          </button>
          <button data-action onClick={onExport} className={actionBtn} title="Exporter">
            <Download className="h-4 w-4" />
          </button>
          <button
            data-action
            onClick={onDelete}
            className={`${actionBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40`}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
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
  const [errorName, setErrorName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorName('Le nom est obligatoire');
      return;
    }
    setErrorName('');

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
                className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 ${
                  errorName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              {errorName && <p className="mt-1 text-xs text-red-600">{errorName}</p>}
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
  const [errorName, setErrorName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorName('Le nom est obligatoire');
      return;
    }
    setErrorName('');

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
                className={`w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 ${
                  errorName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                required
              />
              {errorName && <p className="mt-1 text-xs text-red-600">{errorName}</p>}
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

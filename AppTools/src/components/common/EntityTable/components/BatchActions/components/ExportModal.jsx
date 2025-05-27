// components/ExportModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  Settings,
  Columns,
  FileOutput,
  Grid,
} from 'lucide-react';

import { ENTITY_CONFIG } from '../../../../../../features/products/constants';

const ExportModal = ({
  isOpen,
  onClose,
  onExport,
  selectedItems = [],
  entityName = 'produit',
  entityNamePlural = 'produits',
  activeFilters = [],
}) => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [orientation, setOrientation] = useState('portrait');
  const [exportTitle, setExportTitle] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');
  const [includeId, setIncludeId] = useState(false);

  const availableColumns = ENTITY_CONFIG.columns
    .filter((col) => col.key !== 'image' && col.key !== 'actions')
    .map((col) => ({ key: col.key, label: col.label }));

  const sanitizeFileName = (name) =>
    name ? name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_') : 'export';

  // Réinitialiser les champs quand la modal s'ouvre ou se ferme
  useEffect(() => {
    if (isOpen) {
      const defaults = ENTITY_CONFIG.columns
        .filter((c) => c.key !== 'image' && c.key !== 'actions')
        .map((c) => c.key);
      setSelectedColumns(defaults);
      setIncludeId(false);
      setUseCustomColumn(false);
      setCustomColumnTitle('Décompte');
      setExportFormat('pdf');
      setOrientation('portrait');
      setLoading(false);
      generateExportTitle();
    }
  }, [isOpen, activeFilters]);

  const generateExportTitle = () => {
    let title = `Inventaire ${entityNamePlural}`;
    if (activeFilters.length) {
      const byType = activeFilters.reduce((acc, f) => {
        const [, val] = f.label.split(': ');
        acc[f.type] = acc[f.type] || [];
        acc[f.type].push(val || f.label);
        return acc;
      }, {});
      const parts = Object.values(byType).map((vals) => vals.join(', '));
      if (parts.length) title += ` - ${parts.join(' - ')}`;
    }
    setExportTitle(sanitizeFileName(title));
  };

  // Fonction pour réinitialiser les champs
  const resetForm = () => {
    setSelectedColumns([]);
    setOrientation('portrait');
    setExportTitle('');
    setExportFormat('pdf');
    setUseCustomColumn(false);
    setCustomColumnTitle('Décompte');
    setIncludeId(false);
    setLoading(false);
  };

  // Fonction pour fermer et réinitialiser
  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedColumns.length) {
      alert('Veuillez sélectionner au moins une colonne à exporter');
      return;
    }

    setLoading(true);
    try {
      const title = sanitizeFileName(exportTitle);
      const cols = includeId ? ['_id', ...selectedColumns] : selectedColumns;
      await onExport({
        selectedItems,
        selectedColumns: cols,
        orientation,
        title,
        format: exportFormat,
        customColumn: useCustomColumn ? { title: customColumnTitle } : null,
      });
      resetForm();
      onClose();
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      setLoading(false);
    }
  };

  const getFormatIcon = (format) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <FileOutput className="h-4 w-4" />;
    }
  };

  const getOrientationIcon = (orient) => {
    return orient === 'portrait' ? <FileText className="h-4 w-4" /> : <Grid className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  const selectedCount = selectedItems.length;
  const itemLabel = selectedCount === 1 ? entityName : entityNamePlural;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Download className="h-5 w-5 mr-2 text-blue-500" />
            Configurer l'export
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span className="font-semibold">{selectedCount}</span> {itemLabel} sélectionné
                {selectedCount > 1 ? 's' : ''}
                {activeFilters.length > 0 && (
                  <span className="block mt-1">
                    <span className="font-semibold">{activeFilters.length}</span> filtre
                    {activeFilters.length > 1 ? 's' : ''} appliqué
                    {activeFilters.length > 1 ? 's' : ''}
                  </span>
                )}
              </p>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre du document
              </label>
              <input
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Nom du fichier à exporter"
                required
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format d'export
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: 'pdf',
                    label: 'PDF',
                    description: 'Document portable avec mise en page',
                  },
                  { value: 'csv', label: 'CSV', description: 'Fichier de données pour tableur' },
                ].map((format) => (
                  <label key={format.value} className="flex items-center">
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.value}
                      checked={exportFormat === format.value}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="mr-3 text-blue-600"
                    />
                    <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                      {getFormatIcon(format.value)}
                      <span className="ml-2">
                        <span className="font-medium">{format.label}</span>
                        <span className="text-gray-500 ml-1">- {format.description}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {exportFormat === 'pdf' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Orientation (PDF uniquement)
                </label>
                <div className="space-y-2">
                  {[
                    {
                      value: 'portrait',
                      label: 'Portrait',
                      description: 'Vertical (hauteur > largeur)',
                    },
                    {
                      value: 'landscape',
                      label: 'Paysage',
                      description: 'Horizontal (largeur > hauteur)',
                    },
                  ].map((orient) => (
                    <label key={orient.value} className="flex items-center">
                      <input
                        type="radio"
                        name="orientation"
                        value={orient.value}
                        checked={orientation === orient.value}
                        onChange={(e) => setOrientation(e.target.value)}
                        className="mr-3 text-blue-600"
                      />
                      <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                        {getOrientationIcon(orient.value)}
                        <span className="ml-2">
                          <span className="font-medium">{orient.label}</span>
                          <span className="text-gray-500 ml-1">- {orient.description}</span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Options avancées
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeId}
                    onChange={(e) => setIncludeId(e.target.checked)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <Settings className="h-4 w-4" />
                    <span className="ml-2">Inclure l'identifiant unique (ID)</span>
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useCustomColumn}
                    onChange={(e) => setUseCustomColumn(e.target.checked)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <Columns className="h-4 w-4" />
                    <span className="ml-2">Ajouter une colonne personnalisée</span>
                  </span>
                </label>

                {useCustomColumn && (
                  <div className="ml-7 mt-2">
                    <input
                      type="text"
                      value={customColumnTitle}
                      onChange={(e) => setCustomColumnTitle(e.target.value)}
                      placeholder="Nom de la colonne personnalisée"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Cette colonne sera vide pour permettre la saisie manuelle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Colonnes à inclure ({selectedColumns.length} sélectionnée
                {selectedColumns.length > 1 ? 's' : ''})
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-3">
                {availableColumns.map((col) => (
                  <label key={col.key} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns((prev) => [...prev, col.key]);
                        } else {
                          setSelectedColumns((prev) => prev.filter((k) => k !== col.key));
                        }
                      }}
                      className="mr-2 text-blue-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Résumé de l'export
              </h4>
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <p>
                  • <strong>{selectedCount}</strong> {itemLabel} au format{' '}
                  <strong>{exportFormat.toUpperCase()}</strong>
                </p>
                <p>
                  • <strong>{selectedColumns.length}</strong> colonne
                  {selectedColumns.length > 1 ? 's' : ''} de données
                  {includeId && ' + ID'}
                  {useCustomColumn && ` + "${customColumnTitle}"`}
                </p>
                {exportFormat === 'pdf' && (
                  <p>
                    • Orientation:{' '}
                    <strong>{orientation === 'portrait' ? 'Portrait' : 'Paysage'}</strong>
                  </p>
                )}
                {activeFilters.length > 0 && (
                  <p>
                    • <strong>{activeFilters.length}</strong> filtre
                    {activeFilters.length > 1 ? 's' : ''} appliqué
                    {activeFilters.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !selectedColumns.length}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Génération...
                </>
              ) : (
                <>
                  {getFormatIcon(exportFormat)}
                  <span className="ml-2">Générer {exportFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportModal;

// src/components/common/ExportConfigModal/index.jsx avec ID comme option d'export uniquement
import React, { useState, useEffect } from 'react';
import { X, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { ENTITY_CONFIG } from '../../../../features/products/constants';

const ExportConfigModal = ({
  isOpen,
  onClose,
  onExport,
  selectedItems = [],
  entityName = 'produit',
  entityNamePlural = 'produits',
  activeFilters = [], // Ajout du paramètre pour les filtres actifs
}) => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [orientation, setOrientation] = useState('portrait');
  const [exportTitle, setExportTitle] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isLoading, setIsLoading] = useState(false);

  // Nouvelle option pour la colonne personnalisée
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');

  // Option pour inclure l'ID
  const [includeId, setIncludeId] = useState(false);

  // Créer une liste de colonnes disponibles à partir des colonnes ENTITY_CONFIG
  const availableColumns = ENTITY_CONFIG.columns
    .filter((column) => column.key !== 'image' && column.key !== 'actions')
    .map((column) => ({
      key: column.key,
      label: column.label,
      selected: true,
    }));

  // Fonction pour assainir le nom de fichier
  const sanitizeFileName = (fileName) => {
    if (!fileName) return 'export';
    // Remplacer les caractères non autorisés pour Windows par des underscores
    return fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  };

  // Initialiser les colonnes sélectionnées et le titre au chargement du modal
  useEffect(() => {
    if (isOpen) {
      // Par défaut, sélectionner toutes les colonnes sauf l'image et les actions
      const defaultSelectedColumns = ENTITY_CONFIG.columns
        .filter((col) => col.key !== 'image' && col.key !== 'actions')
        .map((col) => col.key);

      setSelectedColumns(defaultSelectedColumns);
      setIncludeId(false); // Par défaut, ne pas inclure l'ID

      // Générer le titre de l'export en incluant les filtres actifs
      generateExportTitle();
    }
  }, [isOpen, activeFilters]);

  // Fonction pour générer automatiquement le titre basé sur les filtres
  const generateExportTitle = () => {
    let baseTitle = `Inventaire ${entityNamePlural}`;

    // Si des filtres sont actifs, les ajouter au titre
    if (activeFilters && activeFilters.length > 0) {
      // Regrouper les filtres par type
      const filtersByType = activeFilters.reduce((acc, filter) => {
        if (!acc[filter.type]) {
          acc[filter.type] = [];
        }
        // Extraire uniquement le libellé de la valeur, pas le type
        const labelParts = filter.label.split(': ');
        const valueLabel = labelParts.length > 1 ? labelParts[1] : labelParts[0];
        acc[filter.type].push(valueLabel);
        return acc;
      }, {});

      // Construire la partie filtre du titre
      const filterParts = [];

      Object.entries(filtersByType).forEach(([type, values]) => {
        if (values.length === 1) {
          filterParts.push(values[0]);
        } else if (values.length > 1) {
          filterParts.push(`${values.join(', ')}`);
        }
      });

      if (filterParts.length > 0) {
        baseTitle += ` - ${filterParts.join(' - ')}`;
      }
    }

    // Assainir le titre pour éviter les caractères problématiques
    setExportTitle(sanitizeFileName(baseTitle));
  };

  // Fonction pour basculer la sélection d'une colonne
  const toggleColumnSelection = (key) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Gérer le déclenchement de l'export
  const handleExport = async () => {
    setIsLoading(true);

    try {
      // Assainir le titre une dernière fois avant l'export
      const sanitizedTitle = sanitizeFileName(exportTitle);

      // Préparer les colonnes à exporter, en ajoutant l'ID si demandé
      const columnsToExport = includeId ? ['_id', ...selectedColumns] : selectedColumns;

      await onExport({
        selectedItems,
        selectedColumns: columnsToExport,
        orientation,
        title: sanitizedTitle,
        format: exportFormat,
        customColumn: useCustomColumn ? { title: customColumnTitle } : null,
      });
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      // Vous pourriez ajouter un état d'erreur et l'afficher dans l'UI
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* En-tête */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configurer l'export
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6">
          {/* Titre de l'export */}
          <div className="space-y-2">
            <label
              htmlFor="export-title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Titre du document
            </label>
            <input
              id="export-title"
              type="text"
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Format d'export */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Format d'export
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">PDF</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">CSV</span>
              </label>
            </div>
          </div>

          {/* Orientation (uniquement pour PDF) */}
          {exportFormat === 'pdf' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Orientation
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="portrait"
                    checked={orientation === 'portrait'}
                    onChange={() => setOrientation('portrait')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Portrait</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    value="landscape"
                    checked={orientation === 'landscape'}
                    onChange={() => setOrientation('landscape')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Paysage</span>
                </label>
              </div>
            </div>
          )}

          {/* Option pour inclure l'ID */}
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Inclure l'identifiant unique (ID)
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={includeId}
                  onChange={() => setIncludeId(!includeId)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Activer</span>
              </label>
            </div>
            {includeId && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                L'identifiant unique sera inclus comme première colonne dans l'export.
              </p>
            )}
          </div>

          {/* Colonne personnalisée */}
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ajouter une colonne d'inventaire
              </label>
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={useCustomColumn}
                  onChange={() => setUseCustomColumn(!useCustomColumn)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Activer</span>
              </label>
            </div>

            {useCustomColumn && (
              <div className="mt-2">
                <label
                  htmlFor="custom-column-title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Titre de la colonne
                </label>
                <input
                  id="custom-column-title"
                  type="text"
                  value={customColumnTitle}
                  onChange={(e) => setCustomColumnTitle(e.target.value)}
                  placeholder="Décompte physique"
                  className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Cette colonne sera vide pour permettre d'inscrire le décompte physique.
                </p>
              </div>
            )}
          </div>

          {/* Sélection des colonnes */}
          <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Colonnes à inclure
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableColumns.map((column) => (
                <label key={column.key} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => toggleColumnSelection(column.key)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{column.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Résumé */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Export de <span className="font-semibold">{selectedItems.length}</span>{' '}
              {selectedItems.length === 1 ? entityName : entityNamePlural} au format{' '}
              <span className="font-semibold">{exportFormat.toUpperCase()}</span> avec{' '}
              <span className="font-semibold">{selectedColumns.length}</span> colonnes{' '}
              {includeId ? '+ ID ' : ''}
              {useCustomColumn ? `+ colonne "${customColumnTitle}" ` : ''}
              {exportFormat === 'pdf'
                ? `en orientation ${orientation === 'portrait' ? 'portrait' : 'paysage'}`
                : ''}
              .
              {activeFilters && activeFilters.length > 0 && (
                <span className="block mt-1">
                  Filtres appliqués: <span className="font-semibold">{activeFilters.length}</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Pied */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading || selectedColumns.length === 0}
            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white flex items-center ${
              isLoading || selectedColumns.length === 0
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Génération...
              </>
            ) : (
              <>
                {exportFormat === 'pdf' ? (
                  <FileText className="h-4 w-4 mr-1" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                )}
                Générer {exportFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigModal;

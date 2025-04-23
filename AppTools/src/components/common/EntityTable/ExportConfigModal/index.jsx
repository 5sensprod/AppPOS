// src/components/common/ExportConfigModal/index.jsx avec ID comme option d'export uniquement

import React, { useState, useEffect } from 'react';
import { X, FileText, FileSpreadsheet } from 'lucide-react';
import { ENTITY_CONFIG } from '../../../../features/products/constants';

const ExportConfigModal = ({
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
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomColumn, setUseCustomColumn] = useState(false);
  const [customColumnTitle, setCustomColumnTitle] = useState('Décompte');
  const [includeId, setIncludeId] = useState(false);

  const availableColumns = ENTITY_CONFIG.columns
    .filter((col) => col.key !== 'image' && col.key !== 'actions')
    .map((col) => ({ key: col.key, label: col.label }));

  const sanitizeFileName = (name) =>
    name ? name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_') : 'export';

  useEffect(() => {
    if (!isOpen) return;
    const defaults = ENTITY_CONFIG.columns
      .filter((c) => c.key !== 'image' && c.key !== 'actions')
      .map((c) => c.key);
    setSelectedColumns(defaults);
    setIncludeId(false);
    generateExportTitle();
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

  const handleExport = async () => {
    setIsLoading(true);
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
    } catch {
      console.error("Erreur lors de l'export");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <ModalContainer>
        <ModalHeader onClose={onClose} />
        <ModalBody>
          <TitleInput value={exportTitle} onChange={setExportTitle} />
          <FormatSelector format={exportFormat} onChange={setExportFormat} />
          {exportFormat === 'pdf' && (
            <OrientationSelector orientation={orientation} onChange={setOrientation} />
          )}
          <Section title="Inclure l'identifiant unique (ID)">
            <CheckboxField
              checked={includeId}
              onChange={() => setIncludeId((v) => !v)}
              label="Activer"
            />
            {includeId && <small>L'ID sera la première colonne.</small>}
          </Section>
          <CustomColumnSection
            enabled={useCustomColumn}
            onToggle={() => setUseCustomColumn((v) => !v)}
            value={customColumnTitle}
            onChange={setCustomColumnTitle}
          />
          <ColumnsSelection
            available={availableColumns}
            selected={selectedColumns}
            toggle={(key) =>
              setSelectedColumns((prev) =>
                prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
              )
            }
          />
          <Summary
            count={selectedItems.length}
            entityName={entityName}
            entityNamePlural={entityNamePlural}
            format={exportFormat}
            colCount={selectedColumns.length}
            includeId={includeId}
            custom={useCustomColumn}
            customLabel={customColumnTitle}
            orientation={orientation}
            filtersCount={activeFilters.length}
          />
        </ModalBody>
        <ModalFooter
          onClose={onClose}
          onExport={handleExport}
          disabled={isLoading || !selectedColumns.length}
          isLoading={isLoading}
          format={exportFormat}
        />
      </ModalContainer>
    </Overlay>
  );
};

/* ---------- Subcomponents ---------- */

const Overlay = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    {children}
  </div>
);

const ModalContainer = ({ children }) => (
  <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
    {children}
  </div>
);

const ModalHeader = ({ onClose }) => (
  <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center">
      <FileText className="h-5 w-5 text-blue-500 mr-2" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configurer l'export</h2>
    </div>
    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
      <X className="h-5 w-5 text-gray-500" />
    </button>
  </header>
);

const ModalBody = ({ children }) => (
  <div className="p-6 space-y-6 overflow-y-auto flex-grow">{children}</div>
);

const ModalFooter = ({ onClose, onExport, disabled, isLoading, format }) => (
  <footer className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-3">
    <button
      onClick={onClose}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      Annuler
    </button>
    <button
      onClick={onExport}
      disabled={disabled}
      className={`px-4 py-2 rounded-md text-sm font-medium text-white flex items-center ${
        disabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {format === 'pdf' ? (
            <FileText className="h-4 w-4 mr-1" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-1" />
          )}
          Générer {format.toUpperCase()}
        </>
      )}
    </button>
  </footer>
);

const Section = ({ title, children }) => (
  <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
    <div className="flex justify-between">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
    </div>
    {children}
  </div>
);

const CheckboxField = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
    <span className="ml-2 text-gray-700 dark:text-gray-300">{label}</span>
  </label>
);

const TitleInput = ({ value, onChange }) => (
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
    />
  </div>
);

const RadioGroup = ({ options, selected, onChange }) => (
  <div className="flex space-x-4">
    {options.map((opt) => (
      <label key={opt.value} className="inline-flex items-center">
        <input
          type="radio"
          value={opt.value}
          checked={selected === opt.value}
          onChange={() => onChange(opt.value)}
          className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
        />
        <span className="ml-2 text-gray-700 dark:text-gray-300">{opt.label}</span>
      </label>
    ))}
  </div>
);

const FormatSelector = ({ format, onChange }) => (
  <div className="space-y-2">
    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      Format d'export
    </span>
    <RadioGroup
      options={[
        { value: 'pdf', label: 'PDF' },
        { value: 'csv', label: 'CSV' },
      ]}
      selected={format}
      onChange={onChange}
    />
  </div>
);

const OrientationSelector = ({ orientation, onChange }) => (
  <div className="space-y-2">
    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Orientation</span>
    <RadioGroup
      options={[
        { value: 'portrait', label: 'Portrait' },
        { value: 'landscape', label: 'Paysage' },
      ]}
      selected={orientation}
      onChange={onChange}
    />
  </div>
);

const CustomColumnSection = ({ enabled, onToggle, value, onChange }) => (
  <Section title="Ajouter une colonne d'inventaire">
    <CheckboxField checked={enabled} onChange={onToggle} label="Activer" />
    {enabled && (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Décompte physique"
          className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Cette colonne sera vide pour inscrire le décompte physique.
        </p>
      </div>
    )}
  </Section>
);

const ColumnsSelection = ({ available, selected, toggle }) => (
  <Section title="Colonnes à inclure">
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {available.map((col) => (
        <CheckboxField
          key={col.key}
          checked={selected.includes(col.key)}
          onChange={() => toggle(col.key)}
          label={col.label}
        />
      ))}
    </div>
  </Section>
);

const Summary = ({
  count,
  entityName,
  entityNamePlural,
  format,
  colCount,
  includeId,
  custom,
  customLabel,
  orientation,
  filtersCount,
}) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
    <p className="text-sm text-gray-600 dark:text-gray-300">
      Export de <strong>{count}</strong> {count === 1 ? entityName : entityNamePlural} au format{' '}
      <strong>{format.toUpperCase()}</strong> avec <strong>{colCount}</strong> colonnes{' '}
      {includeId ? '+ ID' : ''} {custom ? `+ colonne "${customLabel}"` : ''}{' '}
      {format === 'pdf'
        ? `en orientation ${orientation === 'portrait' ? 'portrait' : 'paysage'}`
        : ''}
      .
      {filtersCount > 0 && (
        <span className="block mt-1">
          Filtres appliqués: <strong>{filtersCount}</strong>
        </span>
      )}
    </p>
  </div>
);

const Spinner = () => (
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
);

export default ExportConfigModal;

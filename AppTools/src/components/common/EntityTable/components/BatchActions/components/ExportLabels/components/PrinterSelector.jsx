// components/PrinterSelector.jsx

import React, { useEffect } from 'react';
import { Printer, RefreshCw, Wifi } from 'lucide-react';
import { useLabelExportStore } from '../stores/useLabelExportStore';

const PrinterSelector = () => {
  const {
    availablePrinters,
    selectedPrinter,
    loadingPrinters,
    printError,
    loadAvailablePrinters,
    selectPrinter,
    resetPrintState,
  } = useLabelExportStore();

  // Charger les imprimantes au montage
  useEffect(() => {
    loadAvailablePrinters();
  }, [loadAvailablePrinters]);

  const handleRefreshPrinters = () => {
    resetPrintState();
    loadAvailablePrinters();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Printer className="h-4 w-4 mr-2" />
          Sélection d'imprimante
        </h4>

        <button
          type="button"
          onClick={handleRefreshPrinters}
          disabled={loadingPrinters}
          className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Actualiser la liste des imprimantes"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loadingPrinters ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Erreur */}
      {printError && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700">
          <div className="text-xs text-red-700 dark:text-red-300">❌ {printError}</div>
        </div>
      )}

      {/* Loading */}
      {loadingPrinters && (
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-700 dark:text-blue-300 flex items-center">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Recherche des imprimantes...
          </div>
        </div>
      )}

      {/* Sélecteur d'imprimante */}
      {availablePrinters.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400">
            Imprimante pour étiquettes
          </label>

          <select
            value={selectedPrinter?.Name || ''}
            onChange={(e) => {
              const printer = availablePrinters.find((p) => p.Name === e.target.value);
              selectPrinter(printer);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700"
          >
            <option value="">Sélectionner une imprimante...</option>
            {availablePrinters.map((printer) => (
              <option key={printer.Name} value={printer.Name}>
                {printer.Name} {printer.Default ? '(Par défaut)' : ''}
              </option>
            ))}
          </select>

          {/* Info imprimante sélectionnée */}
          {selectedPrinter && (
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <div className="text-xs text-green-700 dark:text-green-300">
                <div className="flex items-center font-medium">
                  <Wifi className="h-3 w-3 mr-1" />
                  {selectedPrinter.Name}
                </div>
                <div className="mt-1 space-y-1">
                  <div>Driver: {selectedPrinter.DriverName}</div>
                  <div>Port: {selectedPrinter.PortName}</div>
                  {selectedPrinter.Default && <div>🎯 Imprimante par défaut</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aucune imprimante */}
      {!loadingPrinters && availablePrinters.length === 0 && !printError && (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
          <div className="text-xs text-yellow-700 dark:text-yellow-300">
            ⚠️ Aucune imprimante détectée. Vérifiez que votre imprimante d'étiquettes est connectée
            et allumée.
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterSelector;

// src/hooks/useAdvancedPDFExport.js - VERSION CORRIGÉE (sans preFilteredData)
import { useState, useCallback } from 'react';
import apiService from '../services/api';

export const useAdvancedPDFExport = () => {
  const [exportState, setExportState] = useState({
    status: 'idle',
    error: null,
    fileName: null,
    downloadUrl: null,
  });

  const resetState = useCallback(() => {
    setExportState({
      status: 'idle',
      error: null,
      fileName: null,
      downloadUrl: null,
    });
  }, []);

  const downloadFile = useCallback((blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return url;
  }, []);

  const exportStockStatisticsToPDF = useCallback(
    async (options = {}) => {
      const {
        companyInfo = {},
        reportType = 'summary',
        includeCharts = true,
        includeCompanyInfo = true,
        sortBy = 'name',
        sortOrder = 'asc',
        groupByCategory = false,
        selectedCategories = [],
        includeUncategorized = true,
        isSimplified = false,
        autoDownload = true,
        customFileName = null,
      } = options;

      try {
        setExportState((prev) => ({
          ...prev,
          status: 'exporting',
          error: null,
        }));

        // ✅ Uniquement les paramètres légers — pas de données produits
        const requestData = {
          companyInfo,
          reportType,
          includeCharts,
          includeCompanyInfo,
          sortBy,
          sortOrder,
          groupByCategory,
          selectedCategories,
          includeUncategorized,
          isSimplified,
        };

        const response = await apiService.post(
          '/api/products/stock/statistics/export-pdf',
          requestData,
          {
            responseType: 'blob',
            timeout: 30000,
          }
        );

        const fileName =
          customFileName ||
          `rapport_stock_${reportType}${groupByCategory ? '_categories' : ''}${isSimplified ? '_simplifie' : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

        const blob = new Blob([response.data], { type: 'application/pdf' });
        let downloadUrl = null;

        if (autoDownload) {
          downloadUrl = downloadFile(blob, fileName);
        } else {
          downloadUrl = window.URL.createObjectURL(blob);
        }

        setExportState({
          status: 'success',
          error: null,
          fileName,
          downloadUrl,
        });

        return {
          success: true,
          fileName,
          downloadUrl,
          blob,
          size: blob.size,
        };
      } catch (error) {
        console.error('❌ Erreur export:', error);

        let errorMessage = "Erreur lors de l'export du PDF";

        if (error.code === 'ECONNABORTED') {
          errorMessage = "L'export a pris trop de temps";
        } else if (error.response?.status === 404) {
          errorMessage = "Service d'export indisponible";
        } else if (error.response?.status === 413) {
          errorMessage = 'Requête trop volumineuse';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Erreur serveur';
        } else if (error.message) {
          errorMessage = error.message;
        }

        setExportState({
          status: 'error',
          error: errorMessage,
          fileName: null,
          downloadUrl: null,
        });

        throw new Error(errorMessage);
      }
    },
    [downloadFile] // ✅ rawData supprimé des dépendances
  );

  const manualDownload = useCallback(() => {
    if (exportState.downloadUrl && exportState.fileName) {
      const link = document.createElement('a');
      link.href = exportState.downloadUrl;
      link.download = exportState.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [exportState.downloadUrl, exportState.fileName]);

  const printAfterExport = useCallback(
    async (options = {}) => {
      try {
        const result = await exportStockStatisticsToPDF({
          ...options,
          autoDownload: false,
        });

        if (result.success && result.blob) {
          const printWindow = window.open('', '_blank');
          const url = window.URL.createObjectURL(result.blob);

          printWindow.document.write(`
            <iframe src="${url}" width="100%" height="100%" frameborder="0" onload="
              setTimeout(() => {
                window.print();
                window.close();
                window.URL.revokeObjectURL('${url}');
              }, 500);
            "></iframe>
          `);

          printWindow.document.close();
          printWindow.focus();
        }
      } catch (error) {
        console.error('Erreur impression:', error);
        throw error;
      }
    },
    [exportStockStatisticsToPDF]
  );

  return {
    exportState,
    isExporting: exportState.status === 'exporting',
    isSuccess: exportState.status === 'success',
    isError: exportState.status === 'error',
    isIdle: exportState.status === 'idle',

    exportStockStatisticsToPDF,
    printAfterExport,
    manualDownload,
    resetState,

    getStatusText: () => {
      switch (exportState.status) {
        case 'exporting':
          return 'Export en cours...';
        case 'success':
          return 'Export terminé !';
        case 'error':
          return exportState.error || 'Erreur';
        default:
          return 'Prêt';
      }
    },

    getFileName: () => exportState.fileName,
    getDownloadUrl: () => exportState.downloadUrl,
  };
};

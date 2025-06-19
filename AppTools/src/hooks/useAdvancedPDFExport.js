// src/hooks/useAdvancedPDFExport.js
import { useState, useCallback } from 'react';
import apiService from '../services/api';

export const useAdvancedPDFExport = () => {
  const [exportState, setExportState] = useState({
    status: 'idle', // idle, preparing, exporting, success, error
    progress: 0,
    error: null,
    fileName: null,
    downloadUrl: null,
  });

  const resetState = useCallback(() => {
    setExportState({
      status: 'idle',
      progress: 0,
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
        autoDownload = true,
        onProgress = null,
        customFileName = null,
      } = options;

      try {
        // Phase 1: Préparation
        setExportState((prev) => ({
          ...prev,
          status: 'preparing',
          progress: 10,
          error: null,
        }));

        if (onProgress) onProgress(10, 'Préparation des données...');

        // Simulation d'une pause pour l'UX
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Phase 2: Export
        setExportState((prev) => ({
          ...prev,
          status: 'exporting',
          progress: 30,
        }));

        if (onProgress) onProgress(30, 'Génération du rapport...');

        const endpoint = '/api/products/stock/statistics/export-pdf';

        const requestData = {
          companyInfo,
          reportType,
          includeCharts,
          includeCompanyInfo,
          sortBy,
          sortOrder,
        };

        // Simulation du progrès pendant l'appel API
        const progressInterval = setInterval(() => {
          setExportState((prev) => {
            if (prev.progress < 80) {
              return { ...prev, progress: prev.progress + 10 };
            }
            return prev;
          });
        }, 200);

        const response = await apiService.post(endpoint, requestData, {
          responseType: 'blob',
          timeout: 30000, // 30 secondes de timeout
        });

        clearInterval(progressInterval);

        // Phase 3: Finalisation
        setExportState((prev) => ({
          ...prev,
          progress: 90,
        }));

        if (onProgress) onProgress(90, 'Finalisation...');

        const contentType = response.headers['content-type'] || 'application/pdf';

        const fileName =
          customFileName ||
          `rapport_stock_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;

        const blob = new Blob([response.data], { type: contentType });
        let downloadUrl = null;

        if (autoDownload) {
          downloadUrl = downloadFile(blob, fileName);
        } else {
          downloadUrl = window.URL.createObjectURL(blob);
        }

        // Succès
        setExportState((prev) => ({
          ...prev,
          status: 'success',
          progress: 100,
          fileName,
          downloadUrl,
        }));

        if (onProgress) onProgress(100, 'Export terminé !');

        return {
          success: true,
          fileName,
          downloadUrl,
          blob,
          size: blob.size,
        };
      } catch (error) {
        console.error('❌ Erreur export:', error);

        let errorMessage = "Erreur lors de l'export";

        if (error.code === 'ECONNABORTED') {
          errorMessage = "Timeout - L'export a pris trop de temps";
        } else if (error.response?.status === 404) {
          errorMessage = "Service d'export non disponible";
        } else if (error.response?.status === 500) {
          errorMessage = "Erreur serveur lors de l'export";
        } else if (error.response?.data) {
          try {
            const errorText = await error.response.data.text();
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Ignore si on ne peut pas parser l'erreur
          }
        }

        setExportState((prev) => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          progress: 0,
        }));

        if (onProgress) onProgress(0, errorMessage);

        throw new Error(errorMessage);
      }
    },
    [downloadFile]
  );

  const exportToCSV = useCallback(
    (options = {}) => {
      return exportStockStatisticsToPDF({ ...options, format: 'csv' });
    },
    [exportStockStatisticsToPDF]
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
          <html>
            <head><title>Impression - ${result.fileName}</title></head>
            <body style="margin:0;">
              <iframe src="${url}" width="100%" height="100%" frameborder="0"></iframe>
            </body>
          </html>
        `);

          printWindow.document.close();
          printWindow.focus();

          // Attendre que le PDF soit chargé avant d'imprimer
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            window.URL.revokeObjectURL(url);
          }, 1000);
        }
      } catch (error) {
        console.error("Erreur lors de l'impression:", error);
        throw error;
      }
    },
    [exportStockStatisticsToPDF]
  );

  return {
    // État
    exportState,
    isExporting: exportState.status === 'preparing' || exportState.status === 'exporting',
    isSuccess: exportState.status === 'success',
    isError: exportState.status === 'error',
    isIdle: exportState.status === 'idle',

    // Actions
    exportStockStatisticsToPDF,
    exportToCSV,
    printAfterExport,
    manualDownload,
    resetState,

    // Helpers
    getStatusText: () => {
      switch (exportState.status) {
        case 'preparing':
          return 'Préparation en cours...';
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

    getProgress: () => exportState.progress,
    getFileName: () => exportState.fileName,
    getDownloadUrl: () => exportState.downloadUrl,
  };
};

// src/hooks/useAPIPDFExport.js
import { useState } from 'react';
import apiService from '../services/api';

export const useAPIPDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportStockStatisticsToPDF = async (companyInfo = {}) => {
    setIsExporting(true);

    try {
      const response = await apiService.post(
        '/api/products/stock/statistics/export-pdf',
        { companyInfo },
        { responseType: 'blob' }
      );

      // Créer un lien de téléchargement
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const filename = `rapport_stock_${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ PDF téléchargé avec succès:', filename);
      return { success: true, filename };
    } catch (error) {
      console.error('❌ Erreur export PDF:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportStockStatisticsToPDF,
  };
};

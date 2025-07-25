// src/services/exportService.js - Version nettoyée avec support rouleau
import apiService from './api';

/**
 * Service pour gérer les exports de données
 */
class ExportService {
  /**
   * Exporte les produits selon la configuration fournie
   */
  async exportProducts(exportConfig) {
    try {
      const { format = 'pdf', exportType = 'table' } = exportConfig;

      if (exportType === 'labels') {
        return this.exportLabels(exportConfig);
      }

      if (format === 'pdf') {
        return this.exportProductsToPDF(exportConfig);
      } else if (format === 'csv') {
        return this.exportProductsToCSV(exportConfig);
      } else {
        throw new Error(`Format d'export non supporté: ${format}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'export:`, error);
      throw error;
    }
  }

  /**
   * Exporte les étiquettes des produits
   */
  async exportLabels(exportConfig) {
    try {
      if (!exportConfig.labelData || exportConfig.labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      if (this.shouldUseServerSideExport()) {
        return this.exportLabelsServerSide(exportConfig);
      }

      return this.exportLabelsClientSide(exportConfig);
    } catch (error) {
      console.error("Erreur lors de l'export d'étiquettes:", error);
      throw error;
    }
  }

  /**
   * Export d'étiquettes côté serveur
   */
  async exportLabelsServerSide(exportConfig) {
    try {
      const serverConfig = {
        selectedItems: exportConfig.selectedItems,
        labelLayout: exportConfig.labelLayout || this.getDefaultLabelLayout(),
        orientation: exportConfig.orientation || 'portrait',
        title: exportConfig.title || 'Étiquettes produits',
        exportType: 'labels',
      };

      const response = await apiService.post('/api/products/export/labels', serverConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Etiquettes'}_${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename, 'application/pdf');

      return response.data;
    } catch (error) {
      console.error('Erreur export étiquettes serveur:', error);
      return this.exportLabelsClientSide(exportConfig);
    }
  }

  /**
   * Export d'étiquettes côté client avec support rouleau
   */
  async exportLabelsClientSide(exportConfig) {
    try {
      // Import dynamique des dépendances
      const { jsPDF } = await import('jspdf');
      const JsBarcode = (await import('jsbarcode')).default;

      // Configuration
      const layout = exportConfig.labelLayout?.layout || this.getDefaultLabelLayout();
      const style = exportConfig.labelLayout?.style || this.getDefaultLabelStyle();
      const labelData = exportConfig.labelData;
      const disabledCells = exportConfig.labelLayout?.disabledCells || [];

      // Détecter le mode rouleau
      const isRollMode = layout.supportType === 'rouleau';

      // Dupliquer les étiquettes selon duplicateCount
      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabelData = [];
      for (const label of labelData) {
        for (let i = 0; i < duplicateCount; i++) {
          duplicatedLabelData.push(label);
        }
      }

      // Calcul des dimensions selon le mode
      let pageWidth,
        pageHeight,
        columns,
        rows,
        labelsPerPage,
        offsetLeft,
        offsetTop,
        spacingH,
        spacingV;

      if (isRollMode) {
        // Mode rouleau : 1 colonne centrée
        pageWidth = layout.rouleau?.width || 58;
        pageHeight = 297;
        columns = 1;
        offsetLeft = (pageWidth - layout.width) / 2;
        offsetTop = layout.offsetTop || 5;
        spacingH = 0;
        spacingV = layout.spacingV || 2;

        const usableHeight = pageHeight - offsetTop * 2;
        rows = Math.floor(usableHeight / (layout.height + spacingV));
        labelsPerPage = rows;
      } else {
        // Mode A4 : Grille classique
        pageWidth = 210;
        pageHeight = 297;
        offsetLeft = layout.offsetLeft || 8;
        offsetTop = layout.offsetTop || 22;
        spacingH = layout.spacingH || 0;
        spacingV = layout.spacingV || 0;

        const usableWidth = pageWidth - offsetLeft * 2;
        const usableHeight = pageHeight - offsetTop * 2;
        columns = Math.floor(usableWidth / (layout.width + spacingH));
        rows = Math.floor(usableHeight / (layout.height + spacingV));
        labelsPerPage = columns * rows;
      }

      // Créer le PDF
      const doc = new jsPDF({
        orientation: isRollMode
          ? 'portrait'
          : exportConfig.orientation === 'landscape'
            ? 'landscape'
            : 'portrait',
        unit: 'mm',
        format: isRollMode ? [pageWidth, pageHeight] : 'a4',
      });

      // Placer les étiquettes
      let labelIndex = 0;
      let currentPage = 0;

      while (labelIndex < duplicatedLabelData.length) {
        if (currentPage > 0) {
          if (isRollMode) {
            doc.addPage([pageWidth, pageHeight]);
          } else {
            doc.addPage();
          }
        }

        // Traiter chaque cellule de la page
        for (
          let cellInPage = 0;
          cellInPage < labelsPerPage && labelIndex < duplicatedLabelData.length;
          cellInPage++
        ) {
          const absoluteCellIndex = currentPage * labelsPerPage + cellInPage;

          // Vérifier si cette cellule est désactivée (seulement en mode A4)
          if (!isRollMode && disabledCells.includes(absoluteCellIndex)) {
            continue;
          }

          const label = duplicatedLabelData[labelIndex];
          let x, y;

          if (isRollMode) {
            // Mode rouleau : Position simple en colonne unique
            x = offsetLeft;
            y = offsetTop + cellInPage * (layout.height + spacingV);
          } else {
            // Mode A4 : Position en grille
            const col = cellInPage % columns;
            const row = Math.floor(cellInPage / columns);
            x = offsetLeft + col * (layout.width + spacingH);
            y = offsetTop + row * (layout.height + spacingV);
          }

          // Dessiner l'étiquette
          await this.drawLabelOnPDF(
            doc,
            label,
            { x, y, width: layout.width, height: layout.height },
            style,
            JsBarcode
          );

          labelIndex++;
        }

        currentPage++;
      }

      // Sauvegarder le PDF
      const modeLabel = isRollMode ? 'rouleau' : 'A4';
      const filename = `${exportConfig.title || 'Etiquettes'}_${modeLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error('Erreur export client:', error);
      throw error;
    }
  }

  /**
   * Dessine une étiquette sur le PDF
   */
  async drawLabelOnPDF(doc, labelData, position, style, JsBarcode) {
    const { x, y, width, height } = position;

    try {
      // Bordure
      if (style.showBorder) {
        doc.setDrawColor('#000000');
        doc.setLineWidth(0.1);
        doc.rect(x, y, width, height);
      }

      // Zones de contenu avec padding
      const padding = style.padding || 1;
      const contentX = x + padding;
      const contentY = y + padding;
      const contentWidth = width - padding * 2;
      const contentHeight = height - padding * 2;

      let currentY = contentY;
      const elementSpacing = 1;

      // Calcul des hauteurs
      const nameHeight = style.showName ? Math.max(2.5, (style.nameSize || 10) * 0.4) : 0;
      const priceHeight = style.showPrice ? Math.max(3, (style.priceSize || 14) * 0.4) : 0;
      const barcodeBarHeight = style.showBarcode ? (style.barcodeHeight || 15) * 0.3 : 0;
      const barcodeTextHeight = style.showBarcode ? 4 : 0;
      const totalBarcodeHeight = barcodeBarHeight + barcodeTextHeight;

      // Ajustement si nécessaire
      const totalNeededHeight = nameHeight + priceHeight + totalBarcodeHeight + elementSpacing * 4;
      let finalNameHeight = nameHeight;
      let finalPriceHeight = priceHeight;

      if (totalNeededHeight > contentHeight) {
        const availableForFlexible = contentHeight - totalBarcodeHeight - elementSpacing * 3;
        const flexibleElementsHeight = nameHeight + priceHeight;

        if (flexibleElementsHeight > 0) {
          const reductionRatio = Math.max(0.5, availableForFlexible / flexibleElementsHeight);
          finalNameHeight = nameHeight * reductionRatio;
          finalPriceHeight = priceHeight * reductionRatio;
        }
      }

      // Nom du produit
      if (style.showName && labelData.name) {
        const fontSize = Math.max(6, (style.nameSize || 10) * (finalNameHeight / nameHeight));
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        let displayName = labelData.name.trim();
        let textWidth = doc.getTextWidth(displayName);

        while (textWidth > contentWidth && displayName.length > 8) {
          displayName = displayName.substring(0, displayName.length - 1);
          textWidth = doc.getTextWidth(displayName + '...');
        }

        if (textWidth > contentWidth) {
          displayName = displayName + '...';
          textWidth = doc.getTextWidth(displayName);
          while (textWidth > contentWidth && displayName.length > 6) {
            displayName = displayName.substring(0, displayName.length - 4) + '...';
            textWidth = doc.getTextWidth(displayName);
          }
        } else if (displayName !== labelData.name.trim()) {
          displayName = displayName + '...';
        }

        const textX = contentX + (contentWidth - textWidth) / 2;
        doc.text(displayName, textX, currentY + fontSize * 0.35);
        currentY += finalNameHeight + elementSpacing;
      }

      // Prix
      if (style.showPrice && labelData.price) {
        const priceText = `${labelData.price.toFixed(2)} €`;
        const fontSize = Math.max(8, (style.priceSize || 14) * (finalPriceHeight / priceHeight));

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        const textWidth = doc.getTextWidth(priceText);
        const textX = contentX + (contentWidth - textWidth) / 2;

        doc.text(priceText, textX, currentY + fontSize * 0.35);
        currentY += finalPriceHeight + elementSpacing;
      }

      // Code-barres
      if (style.showBarcode && labelData.barcode && labelData.barcode.trim() !== '') {
        try {
          const canvas = document.createElement('canvas');
          const userBarcodeHeight = (style.barcodeHeight || 15) * 0.25;
          const targetBarcodeWidth = Math.min(contentWidth - 1, 35);

          canvas.width = targetBarcodeWidth * 10;
          canvas.height = userBarcodeHeight * 8;

          JsBarcode(canvas, labelData.barcode, {
            format: 'EAN13',
            width: 2,
            height: userBarcodeHeight * 6,
            displayValue: false,
            background: '#ffffff',
            lineColor: '#000000',
            margin: 2,
          });

          const imgData = canvas.toDataURL('image/png');
          const barcodeX = contentX + (contentWidth - targetBarcodeWidth) / 2;
          const barcodeY = contentY + contentHeight - totalBarcodeHeight;

          doc.addImage(imgData, 'PNG', barcodeX, barcodeY, targetBarcodeWidth, userBarcodeHeight);

          // Texte sous le code-barres
          const formattedText = this.formatEAN13Text(labelData.barcode);
          const fontSize = Math.max(7, 9);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');

          const textWidth = doc.getTextWidth(formattedText);
          const textX = contentX + (contentWidth - textWidth) / 2;
          const textY = barcodeY + userBarcodeHeight + 3;

          doc.text(formattedText, textX, textY);
        } catch (barcodeError) {
          console.warn('Erreur génération code-barres:', barcodeError);
          // Fallback
          const fontSize = Math.max(8, 10);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');
          const codeWidth = doc.getTextWidth(labelData.barcode);
          const codeX = contentX + (contentWidth - codeWidth) / 2;
          doc.text(labelData.barcode, codeX, contentY + contentHeight - 5);
        }
      }
    } catch (error) {
      console.error('Erreur dessin étiquette:', error);
      // Fallback minimal
      if (labelData.price) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const priceText = `${labelData.price.toFixed(2)} €`;
        const textWidth = doc.getTextWidth(priceText);
        const textX = x + (width - textWidth) / 2;
        doc.text(priceText, textX, y + height / 2);
      }
    }
  }

  /**
   * Formatage du texte EAN13
   */
  formatEAN13Text(barcode) {
    const cleanBarcode = barcode.replace(/[\s-]/g, '');
    if (cleanBarcode.length === 13 && /^\d+$/.test(cleanBarcode)) {
      return `${cleanBarcode[0]} ${cleanBarcode.slice(1, 7)} ${cleanBarcode.slice(7)}`;
    }
    if (cleanBarcode.length === 8 && /^\d+$/.test(cleanBarcode)) {
      return `${cleanBarcode.slice(0, 4)} ${cleanBarcode.slice(4)}`;
    }
    if (cleanBarcode.length === 12 && /^\d+$/.test(cleanBarcode)) {
      const ean13 = '0' + cleanBarcode;
      return `${ean13[0]} ${ean13.slice(1, 7)} ${ean13.slice(7)}`;
    }
    return cleanBarcode;
  }

  /**
   * Configuration par défaut
   */
  getDefaultLabelLayout() {
    return {
      width: 48.5,
      height: 25,
      offsetTop: 22,
      offsetLeft: 8,
      spacingH: 0,
      spacingV: 0,
      supportType: 'A4',
      rouleau: { width: 58 },
    };
  }

  getDefaultLabelStyle() {
    return {
      fontSize: 12,
      fontFamily: 'Arial',
      showBorder: false,
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 2,
      alignment: 'center',
      showBarcode: true,
      barcodeHeight: 15,
      showPrice: true,
      priceSize: 14,
      showName: false,
      nameSize: 10,
    };
  }

  shouldUseServerSideExport() {
    return false; // Client-side pour l'instant
  }

  /**
   * Export PDF classique
   */
  async exportProductsToPDF(exportConfig) {
    try {
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        orientation: exportConfig.orientation,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
      };

      const response = await apiService.post('/api/products/export/pdf', streamlinedConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename, 'application/pdf');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      throw error;
    }
  }

  /**
   * Export CSV
   */
  async exportProductsToCSV(exportConfig) {
    try {
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
      };

      const response = await apiService.post('/api/products/export/csv', streamlinedConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.csv`;
      this.downloadBlob(response.data, filename, 'text/csv');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      throw error;
    }
  }

  /**
   * Télécharge un blob comme fichier
   */
  downloadBlob(blob, filename, mimeType) {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }
}

export default new ExportService();

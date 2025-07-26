// 📁 services/fabricExportService.js - Dimensions corrigées
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../utils/formatters.js';
class FabricExportService {
  async exportLabelsToPDF(exportConfig) {
    try {
      const { jsPDF } = await import('jspdf');
      const {
        labelData = [],
        labelLayout = {},
        orientation = 'portrait',
        title = 'Etiquettes',
      } = exportConfig;

      if (!labelData || labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      const layout = labelLayout.layout || {
        width: 48.5,
        height: 25,
        offsetTop: 22,
        offsetLeft: 8,
        spacingV: 0,
        spacingH: 0,
        supportType: 'A4',
      };

      const style = labelLayout.style || {
        padding: 1,
        showBorder: false,
        showName: false,
        showPrice: true,
        showBarcode: true,
        nameSize: 10,
        priceSize: 14,
        barcodeHeight: 15,
      };

      const isRollMode = layout.supportType === 'rouleau';

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabelData = [];
      for (const label of labelData) {
        for (let i = 0; i < duplicateCount; i++) {
          duplicatedLabelData.push(label);
        }
      }

      const cutMode = this.determineCutMode(layout);

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
        pageWidth = layout.rouleau?.width || 58;
        pageHeight = 297;
        columns = 1;
        offsetLeft = (pageWidth - layout.width) / 2;
        offsetTop = layout.offsetTop || 5;
        spacingH = 0;
        spacingV = layout.spacingV || 2;

        const usableHeight = pageHeight - offsetTop * 2;
        rows = Math.floor(usableHeight / (layout.height + spacingV));

        if (cutMode.id === 'cut_per_label') {
          labelsPerPage = 1;
        } else if (cutMode.id === 'groups') {
          labelsPerPage = cutMode.labelsPerGroup || 3;
        } else {
          labelsPerPage = rows; // Mode continu
        }
      } else {
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

      const doc = new jsPDF({
        orientation: isRollMode ? 'portrait' : orientation,
        unit: 'mm',
        format: isRollMode ? [pageWidth, pageHeight] : 'a4',
      });

      // ✅ GÉNÉRATION ÉTIQUETTE PAR ÉTIQUETTE (avec données dupliquées)
      let labelIndex = 0;
      let currentPage = 0;

      while (labelIndex < duplicatedLabelData.length) {
        if (currentPage > 0) {
          doc.addPage();
        }

        for (
          let cellInPage = 0;
          cellInPage < labelsPerPage && labelIndex < duplicatedLabelData.length;
          cellInPage++
        ) {
          const label = duplicatedLabelData[labelIndex];

          try {
            let x, y;
            if (isRollMode) {
              x = offsetLeft;
              y = offsetTop + cellInPage * (layout.height + spacingV);
            } else {
              const col = cellInPage % columns;
              const row = Math.floor(cellInPage / columns);
              x = offsetLeft + col * (layout.width + spacingH);
              y = offsetTop + row * (layout.height + spacingV);
            }

            await this.drawLabelDirectlyOnPDF(
              doc,
              label,
              { x, y, width: layout.width, height: layout.height },
              style
            );
          } catch (labelError) {
            console.error(`❌ Erreur étiquette ${label.name}:`, labelError);
          }

          labelIndex++;
        }

        currentPage++;
      }

      // Sauvegarder
      const filename = `${title}_fabric_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error('❌ [FabricExport] Erreur:', error);
      throw error;
    }
  }

  async drawLabelDirectlyOnPDF(doc, label, position, style) {
    const { x, y, width, height } = position;

    try {
      // Bordure
      if (style.showBorder) {
        doc.setDrawColor(style.borderColor || '#000000');
        doc.setLineWidth(style.borderWidth || 0.1);
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

      const nameHeight = style.showName ? Math.max(2.5, (style.nameSize || 10) * 0.4) : 0;
      const priceHeight = style.showPrice ? Math.max(3, (style.priceSize || 14) * 0.4) : 0;
      const barcodeBarHeight = style.showBarcode ? (style.barcodeHeight || 15) * 0.3 : 0;
      const barcodeTextHeight = style.showBarcode ? 4 : 0;
      const totalBarcodeHeight = barcodeBarHeight + barcodeTextHeight;

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

      // ✅ NOM DU PRODUIT
      if (style.showName && label.name) {
        const fontSize = Math.max(6, (style.nameSize || 10) * (finalNameHeight / nameHeight));
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        let displayName = label.name.trim();
        let textWidth = doc.getTextWidth(displayName);

        // Troncature identique
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
        } else if (displayName !== label.name.trim()) {
          displayName = displayName + '...';
        }

        const textX = contentX + (contentWidth - textWidth) / 2;
        doc.text(displayName, textX, currentY + fontSize * 0.35);
        currentY += finalNameHeight + elementSpacing;
      }

      // ✅ PRIX
      if (style.showPrice && label.price !== undefined) {
        // ✅ Utilisation de formatCurrency au lieu du formatage manuel
        const priceText = formatCurrency(label.price);
        const fontSize = Math.max(8, (style.priceSize || 14) * (finalPriceHeight / priceHeight));

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        const textWidth = doc.getTextWidth(priceText);
        const textX = contentX + (contentWidth - textWidth) / 2;

        doc.text(priceText, textX, currentY + fontSize * 0.35);
        currentY += finalPriceHeight + elementSpacing;
      }

      // ✅ CODE-BARRES
      if (style.showBarcode && label.barcode && label.barcode.trim() !== '') {
        try {
          const userBarcodeHeight = (style.barcodeHeight || 15) * 0.3;
          const targetBarcodeWidth = Math.min(contentWidth - 1, 35);

          // Créer canvas temporaire pour le code-barres
          const canvas = document.createElement('canvas');
          canvas.width = targetBarcodeWidth * 10;
          canvas.height = userBarcodeHeight * 8;

          JsBarcode(canvas, label.barcode, {
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
          const formattedText = this.formatEAN13Text(label.barcode);
          const fontSize = Math.max(7, 9);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');

          const textWidth = doc.getTextWidth(formattedText);
          const textX = contentX + (contentWidth - textWidth) / 2;
          const textY = barcodeY + userBarcodeHeight + 3;

          doc.text(formattedText, textX, textY);
        } catch (barcodeError) {
          console.warn('Erreur code-barres:', barcodeError);
          // Fallback texte simple
          const fontSize = Math.max(8, 10);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');
          const codeWidth = doc.getTextWidth(label.barcode);
          const codeX = contentX + (contentWidth - codeWidth) / 2;
          doc.text(label.barcode, codeX, contentY + contentHeight - 5);
        }
      }
    } catch (error) {
      console.error('Erreur dessin étiquette:', error);
      // Fallback minimal
      if (label.price) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        // ✅ Utilisation de formatCurrency ici aussi
        const priceText = formatCurrency(label.price);
        const textWidth = doc.getTextWidth(priceText);
        const textX = x + (width - textWidth) / 2;
        doc.text(priceText, textX, y + height / 2);
      }
    }
  }

  determineCutMode(layout) {
    if (layout.cutPerLabel === true) {
      return {
        id: 'cut_per_label',
        name: 'Une page par étiquette',
      };
    }

    if (layout.labelsPerGroup && layout.labelsPerGroup > 1) {
      return {
        id: 'groups',
        name: `Groupes de ${layout.labelsPerGroup}`,
        labelsPerGroup: layout.labelsPerGroup,
      };
    }

    return {
      id: 'continuous',
      name: 'Continu',
    };
  }
  formatEAN13Text(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }
}

export default new FabricExportService();

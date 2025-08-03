//services/LabelRenderer.js
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../utils/formatters.js';

class LabelRenderer {
  constructor() {
    this.mmToPx = 3.779527559;
    this.pxToMm = 1 / this.mmToPx;
  }

  async renderToCanvas(canvasElement, label, layout, style, options = {}) {
    const fabric = await import('fabric');
    if (canvasElement.__fabricCanvas__) {
      canvasElement.__fabricCanvas__.dispose();
      canvasElement.__fabricCanvas__ = null;
    }

    const scaleFactor = options.highRes ? 4 : 1;
    const canvasWidth = layout.width * this.mmToPx * scaleFactor;
    const canvasHeight = layout.height * this.mmToPx * scaleFactor;

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: false,
      enableRetinaScaling: true,
      imageSmoothingEnabled: false,
    });
    canvasElement.__fabricCanvas__ = fabricCanvas;

    const customPositions = style.customPositions || {};
    const elements = this._calculateElements(layout, style, scaleFactor, customPositions);

    if (style.showBorder) {
      await this._addBorder(fabricCanvas, canvasWidth, canvasHeight, style, fabric, scaleFactor);
    }

    if (style.showName && label.name) {
      await this._addName(fabricCanvas, label, elements.name, style, fabric, scaleFactor);
    }

    if (style.showPrice && label.price !== undefined) {
      await this._addPrice(fabricCanvas, label, elements.price, style, fabric, scaleFactor);
    }

    if (style.showBarcode && label.barcode?.trim()) {
      await this._addBarcode(fabricCanvas, label, elements.barcode, style, fabric, scaleFactor);
    }

    fabricCanvas.renderAll();
    return fabricCanvas;
  }

  async exportLabelsToPDF(exportConfig) {
    try {
      const { jsPDF } = await import('jspdf');
      const { labelData = [], labelLayout = {}, title = 'Etiquettes' } = exportConfig;

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

      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabels = [];
      for (const label of labelData) {
        for (let i = 0; i < duplicateCount; i++) {
          duplicatedLabels.push(label);
        }
      }

      const pageConfig = this._calculatePageLayout(layout, duplicatedLabels.length);
      const isRollMode = layout.supportType === 'rouleau';

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isRollMode ? [pageConfig.pageWidth, pageConfig.pageHeight] : 'a4',
      });

      let disabledCells = new Set();
      if (!isRollMode) {
        const disabledCellsArray =
          labelLayout.disabledCells ||
          labelLayout.layout?.disabledCells ||
          labelLayout.style?.disabledCells ||
          [];
        disabledCells = new Set(disabledCellsArray);
      }

      let labelIndex = 0;
      let currentPage = 0;

      while (labelIndex < duplicatedLabels.length) {
        if (currentPage > 0) {
          doc.addPage();
        }

        const tempCanvas = document.createElement('canvas');

        if (isRollMode) {
          const label = duplicatedLabels[labelIndex];

          try {
            const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
              highRes: true,
            });

            const canvasElement = fabricCanvas.toCanvasElement();
            const imgData = canvasElement.toDataURL('image/png', 1.0);

            const x = (pageConfig.pageWidth - layout.width) / 2;
            const y = (pageConfig.pageHeight - layout.height) / 2;

            doc.addImage(imgData, 'PNG', x, y, layout.width, layout.height, undefined, 'FAST');
            fabricCanvas.dispose();
          } catch (error) {
            console.error(`Erreur étiquette ${label.name}:`, error);
          }

          labelIndex++;
        } else {
          let cellIndex = 0;
          let labelsPlacedOnPage = 0;

          while (
            cellIndex < pageConfig.labelsPerPage &&
            labelIndex < duplicatedLabels.length &&
            labelsPlacedOnPage < pageConfig.labelsPerPage
          ) {
            if (disabledCells.has(cellIndex)) {
              cellIndex++;
              continue;
            }

            const label = duplicatedLabels[labelIndex];

            try {
              const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
                highRes: true,
              });

              const canvasElement = fabricCanvas.toCanvasElement();
              const imgData = canvasElement.toDataURL('image/png', 1.0);
              const position = this._calculateLabelPosition(cellIndex, pageConfig, layout);

              doc.addImage(
                imgData,
                'PNG',
                position.x,
                position.y,
                layout.width,
                layout.height,
                undefined,
                'FAST'
              );

              fabricCanvas.dispose();
            } catch (error) {
              console.error(`Erreur étiquette ${label.name}:`, error);
            }

            labelIndex++;
            labelsPlacedOnPage++;
            cellIndex++;
          }
        }

        currentPage++;
      }

      const filename = `${title}_${isRollMode ? 'rouleau' : 'A4'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      return { success: true, filename };
    } catch (error) {
      console.error('Erreur export PDF:', error);
      throw error;
    }
  }

  _calculateElements(layout, style, scaleFactor = 1, customPositions = {}) {
    const canvasWidth = layout.width * this.mmToPx * scaleFactor;
    const canvasHeight = layout.height * this.mmToPx * scaleFactor;
    const padding = (style.padding || 1) * this.mmToPx * scaleFactor;
    const contentWidth = canvasWidth - padding * 2;

    const elements = {};
    let currentY = padding;
    const spacing = 8 * scaleFactor;

    if (style.showName) {
      const nameHeight = Math.max(15, (style.nameSize || 10) * 1.2) * scaleFactor;
      const customNamePos = customPositions.name;

      if (customNamePos) {
        elements.name = {
          x: customNamePos.x * this.mmToPx * scaleFactor,
          y: customNamePos.y * this.mmToPx * scaleFactor,
          width: contentWidth,
          height: nameHeight,
          fontSize: (style.nameSize || 10) * scaleFactor,
          centerX: customNamePos.centerX * this.mmToPx * scaleFactor,
        };
      } else {
        elements.name = {
          x: padding,
          y: currentY,
          width: contentWidth,
          height: nameHeight,
          fontSize: (style.nameSize || 10) * scaleFactor,
          centerX: padding + contentWidth / 2,
        };
        currentY += nameHeight + spacing;
      }
    }

    if (style.showPrice) {
      const priceHeight = Math.max(20, (style.priceSize || 14) * 1.4) * scaleFactor;
      const customPricePos = customPositions.price;

      if (customPricePos) {
        elements.price = {
          x: customPricePos.x * this.mmToPx * scaleFactor,
          y: customPricePos.y * this.mmToPx * scaleFactor,
          width: contentWidth,
          height: priceHeight,
          fontSize: (style.priceSize || 14) * scaleFactor,
          centerX: customPricePos.centerX * this.mmToPx * scaleFactor,
        };
      } else {
        elements.price = {
          x: padding,
          y: currentY,
          width: contentWidth,
          height: priceHeight,
          fontSize: (style.priceSize || 14) * scaleFactor,
          centerX: padding + contentWidth / 2,
        };
        currentY += priceHeight + spacing;
      }
    }

    if (style.showBarcode) {
      const barcodeHeight = (style.barcodeHeight || 15) * this.mmToPx * 0.4 * scaleFactor;
      const textHeight = 12 * scaleFactor;
      const totalHeight = barcodeHeight + textHeight + 4 * scaleFactor;
      const customBarcodePos = customPositions.barcode;

      if (customBarcodePos) {
        elements.barcode = {
          x: customBarcodePos.x * this.mmToPx * scaleFactor,
          y: customBarcodePos.y * this.mmToPx * scaleFactor,
          width: contentWidth,
          height: totalHeight,
          barcodeHeight: barcodeHeight,
          textHeight: textHeight,
          centerX: customBarcodePos.centerX * this.mmToPx * scaleFactor,
          scaleFactor: scaleFactor,
        };
      } else {
        elements.barcode = {
          x: padding,
          y: canvasHeight - padding - totalHeight,
          width: contentWidth,
          height: totalHeight,
          barcodeHeight: barcodeHeight,
          textHeight: textHeight,
          centerX: padding + contentWidth / 2,
          scaleFactor: scaleFactor,
        };
      }
    }

    return elements;
  }

  async _addBorder(fabricCanvas, width, height, style, fabric, scaleFactor = 1) {
    const borderWidth = (style.borderWidth || 1) * this.mmToPx * scaleFactor;
    const halfStroke = borderWidth / 60;

    width = Math.floor(fabricCanvas.getWidth());
    height = Math.floor(fabricCanvas.getHeight());

    const border = new fabric.Rect({
      left: halfStroke - 1,
      top: halfStroke,
      width: width - borderWidth,
      height: height - borderWidth,
      fill: 'transparent',
      stroke: style.borderColor || '#000000',
      strokeWidth: borderWidth,
      strokeUniform: true,
      selectable: false,
    });

    fabricCanvas.add(border);
  }

  async _addName(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    const nameText = new fabric.Text(label.name, {
      left: element.centerX,
      top: element.y,
      originX: 'center',
      fontSize: element.fontSize,
      fontFamily: style.fontFamily || 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      selectable: false,
      paintFirst: 'fill',
    });
    fabricCanvas.add(nameText);
  }

  async _addPrice(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    const priceText = formatCurrency(label.price);
    const price = new fabric.Text(priceText, {
      left: element.centerX,
      top: element.y,
      originX: 'center',
      fontSize: element.fontSize,
      fontFamily: style.fontFamily || 'Arial',
      fontWeight: 'bold',
      fill: '#000000',
      selectable: false,
      paintFirst: 'fill',
    });
    fabricCanvas.add(price);
  }

  async _addBarcode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    try {
      const barcodeCanvas = document.createElement('canvas');
      const barcodeWidth = Math.min(element.width - 10 * scaleFactor, 150 * scaleFactor);

      barcodeCanvas.width = barcodeWidth;
      barcodeCanvas.height = element.barcodeHeight;

      JsBarcode(barcodeCanvas, label.barcode, {
        format: 'EAN13',
        width: 1.5 * scaleFactor,
        height: element.barcodeHeight * 0.9,
        displayValue: false,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 0,
        flat: true,
      });

      const barcodeImg = new fabric.Image(barcodeCanvas, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        selectable: false,
        imageSmoothing: false,
      });
      fabricCanvas.add(barcodeImg);

      const barcodeText = new fabric.Text(this.formatEAN13Text(label.barcode), {
        left: element.centerX,
        top: element.y + element.barcodeHeight + 2 * scaleFactor,
        originX: 'center',
        fontSize: 9 * scaleFactor,
        fontFamily: 'Arial',
        fill: '#000000',
        selectable: false,
        paintFirst: 'fill',
      });
      fabricCanvas.add(barcodeText);
    } catch (error) {
      console.warn('Erreur code-barres:', error);
      const fallbackText = new fabric.Text(label.barcode, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        fontSize: 10 * scaleFactor,
        fontFamily: 'Arial',
        fill: '#000000',
        selectable: false,
      });
      fabricCanvas.add(fallbackText);
    }
  }

  _calculatePageLayout(layout, totalLabels = 1) {
    const isRollMode = layout.supportType === 'rouleau';

    if (isRollMode) {
      return {
        isRollMode: true,
        pageWidth: layout.rouleau?.width || layout.width,
        pageHeight: layout.height,
        labelsPerPage: 1,
      };
    } else {
      const pageWidth = 210;
      const pageHeight = 297;
      const usableWidth = pageWidth - (layout.offsetLeft || 8) * 2;
      const usableHeight = pageHeight - (layout.offsetTop || 22) * 2;
      const columns = Math.floor(usableWidth / (layout.width + (layout.spacingH || 0)));
      const rows = Math.floor(usableHeight / (layout.height + (layout.spacingV || 0)));

      return {
        isRollMode: false,
        pageWidth,
        pageHeight,
        columns,
        rows,
        labelsPerPage: columns * rows,
      };
    }
  }

  _calculateLabelPosition(cellIndex, pageConfig, layout) {
    if (pageConfig.isRollMode) {
      return {
        x: (pageConfig.pageWidth - layout.width) / 2,
        y: (layout.offsetTop ?? 5) + cellIndex * (layout.height + (layout.spacingV ?? 2)),
      };
    } else {
      const col = cellIndex % pageConfig.columns;
      const row = Math.floor(cellIndex / pageConfig.columns);
      return {
        x: (layout.offsetLeft || 8) + col * (layout.width + (layout.spacingH || 0)),
        y: (layout.offsetTop || 22) + row * (layout.height + (layout.spacingV || 0)),
      };
    }
  }

  formatEAN13Text(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }
}

export default new LabelRenderer();

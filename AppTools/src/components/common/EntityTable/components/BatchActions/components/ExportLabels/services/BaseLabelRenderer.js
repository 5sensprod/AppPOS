//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\services\BaseLabelRenderer.js
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../../../../../../../utils/formatters.js';

/**
 * Classe de base pour le rendu d'étiquettes
 * Contient toutes les méthodes communes aux deux modes (A4 et Rouleau)
 */
class BaseLabelRenderer {
  constructor() {
    this.mmToPx = 3.779527559;
    this.pxToMm = 1 / this.mmToPx;
  }

  /**
   * Rendu d'une étiquette sur canvas Fabric.js
   */
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

  /**
   * Calcul des éléments et leur positionnement
   */
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

  /**
   * Ajout de la bordure
   */
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

  /**
   * Ajout du nom/titre
   */
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

  /**
   * Ajout du prix
   */
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

  /**
   * Ajout du code-barres
   */
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

  /**
   * Formatage du texte EAN13
   */
  formatEAN13Text(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }

  /**
   * Préparation des données d'étiquettes dupliquées
   */
  _prepareDuplicatedLabels(labelData, duplicateCount) {
    const duplicatedLabels = [];
    for (const label of labelData) {
      for (let i = 0; i < duplicateCount; i++) {
        duplicatedLabels.push(label);
      }
    }
    return duplicatedLabels;
  }

  /**
   * Rendu d'une étiquette unique sur canvas temporaire
   */
  async _renderSingleLabelToCanvas(label, layout, style) {
    const tempCanvas = document.createElement('canvas');
    try {
      const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
        highRes: true,
      });
      const canvasElement = fabricCanvas.toCanvasElement();
      const imgData = canvasElement.toDataURL('image/png', 1.0);
      fabricCanvas.dispose();
      return imgData;
    } catch (error) {
      console.error(`Erreur étiquette ${label.name}:`, error);
      throw error;
    }
  }
}

export default BaseLabelRenderer;

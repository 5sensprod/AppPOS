import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../../../../../../../utils/formatters.js';

/**
 * Classe de base optimisée pour le rendu d'étiquettes
 */
class BaseLabelRenderer {
  constructor() {
    this.mmToPx = 3.779527559;

    // 🎯 ÉCHELLES SIMPLIFIÉES
    this.SCALES = {
      display: 1, // 96 DPI pour affichage
      highRes: 200 / 96, // 200 DPI pour print/export (2.083)
    };
  }

  // 🚀 Facteur d'échelle unifié
  getScaleFactor(context = 'display') {
    return context === 'display' || context === 'preview'
      ? this.SCALES.display
      : this.SCALES.highRes;
  }

  // 🎯 Rendu canvas optimisé
  async renderToCanvas(canvasElement, label, layout, style, options = {}) {
    const fabric = await import('fabric');

    // Cleanup canvas existant
    if (canvasElement.__fabricCanvas__) {
      canvasElement.__fabricCanvas__.dispose();
      canvasElement.__fabricCanvas__ = null;
    }

    const baseScale = options.highRes ? 4 : 1;
    const contextScale = this.getScaleFactor(options.context || 'display');

    // 🔧 Facteurs séparés pour qualité optimale
    const canvasScale = baseScale * contextScale;
    const elementScale = baseScale;

    // Configuration canvas
    const canvasWidth = layout.width * this.mmToPx * canvasScale;
    const canvasHeight = layout.height * this.mmToPx * canvasScale;

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: false,
      enableRetinaScaling: false,
      imageSmoothingEnabled: contextScale > 1,
    });

    canvasElement.__fabricCanvas__ = fabricCanvas;

    // 🎯 Transformation pour haute résolution
    if (contextScale > 1) {
      const offsetX = (canvasWidth - layout.width * this.mmToPx * elementScale * contextScale) / 2;
      const offsetY =
        (canvasHeight - layout.height * this.mmToPx * elementScale * contextScale) / 2;

      fabricCanvas.viewportTransform = [contextScale, 0, 0, contextScale, offsetX, offsetY];
    }

    // Calcul des éléments
    const elements = this._calculateElements(
      layout,
      style,
      elementScale,
      style.customPositions || {}
    );

    // 🎨 Rendu des éléments
    await this._renderElements(fabricCanvas, label, elements, style, fabric, elementScale, layout);

    fabricCanvas.renderAll();
    return fabricCanvas;
  }

  // 🚀 Rendu unifié des éléments
  async _renderElements(fabricCanvas, label, elements, style, fabric, scaleFactor, layout) {
    // Bordure
    if (style.showBorder) {
      await this._addBorder(fabricCanvas, layout, style, fabric, scaleFactor);
    }

    // Nom (tolérant)
    if (style.showName && label.name?.trim()) {
      await this._addText(fabricCanvas, label.name, elements.name, style, fabric, 'name');
    }

    // Prix (tolérant)
    if (style.showPrice && label.price != null && label.price >= 0) {
      const priceText = formatCurrency(label.price);
      await this._addText(fabricCanvas, priceText, elements.price, style, fabric, 'price');
    }

    // Code-barres (tolérant avec fallback)
    if (style.showBarcode && label.barcode?.trim()) {
      await this._addBarcode(fabricCanvas, label, elements.barcode, style, fabric, scaleFactor);
    }
  }

  // 🎯 Calcul des éléments simplifié
  _calculateElements(layout, style, scaleFactor = 1, customPositions = {}) {
    const canvasWidth = layout.width * this.mmToPx * scaleFactor;
    const canvasHeight = layout.height * this.mmToPx * scaleFactor;
    const padding = (layout.padding || 2) * this.mmToPx * scaleFactor;
    const contentWidth = canvasWidth - padding * 2;

    const elements = {};
    let currentY = padding;
    const spacing = 8 * scaleFactor;

    // Helper pour créer un élément
    const createElement = (type, height, customPos) => {
      if (customPos) {
        return {
          x: customPos.x * this.mmToPx * scaleFactor,
          y: customPos.y * this.mmToPx * scaleFactor,
          width: contentWidth,
          height,
          centerX: customPos.centerX * this.mmToPx * scaleFactor,
        };
      }

      const element = {
        x: padding,
        y: currentY,
        width: contentWidth,
        height,
        centerX: padding + contentWidth / 2,
      };

      currentY += height + spacing;
      return element;
    };

    // Calcul des éléments
    if (style.showName) {
      const height = Math.max(15, (style.nameSize || 10) * 1.2) * scaleFactor;
      elements.name = {
        ...createElement('name', height, customPositions.name),
        fontSize: (style.nameSize || 10) * scaleFactor,
      };
    }

    if (style.showPrice) {
      const height = Math.max(20, (style.priceSize || 14) * 1.4) * scaleFactor;
      elements.price = {
        ...createElement('price', height, customPositions.price),
        fontSize: (style.priceSize || 14) * scaleFactor,
      };
    }

    if (style.showBarcode) {
      const barcodeHeight = (style.barcodeHeight || 15) * this.mmToPx * 0.4 * scaleFactor;
      const textHeight = 12 * scaleFactor;
      const totalHeight = barcodeHeight + textHeight + 4 * scaleFactor;

      elements.barcode = customPositions.barcode
        ? createElement('barcode', totalHeight, customPositions.barcode)
        : {
            x: padding,
            y: canvasHeight - padding - totalHeight,
            width: contentWidth,
            height: totalHeight,
            centerX: padding + contentWidth / 2,
          };

      elements.barcode.barcodeHeight = barcodeHeight;
      elements.barcode.textHeight = textHeight;
    }

    return elements;
  }

  // 🎨 Ajout de texte unifié
  async _addText(fabricCanvas, text, element, style, fabric, type) {
    const textObj = new fabric.Text(text, {
      left: element.centerX,
      top: element.y,
      originX: 'center',
      fontSize: element.fontSize,
      fontFamily: style.fontFamily || 'Arial',
      fontWeight: type === 'price' ? 'bold' : type === 'name' ? 'bold' : 'normal',
      fill: '#000000',
      selectable: false,
      paintFirst: 'fill',
    });

    fabricCanvas.add(textObj);
  }

  // 🎯 Bordure simplifiée
  async _addBorder(fabricCanvas, layout, style, fabric, scaleFactor = 1) {
    const width = layout.width * this.mmToPx * scaleFactor;
    const height = layout.height * this.mmToPx * scaleFactor;
    const borderWidth = (style.borderWidth || 1) * this.mmToPx * scaleFactor;
    const margin = (layout.padding || style.padding || 1) * this.mmToPx * scaleFactor;
    const halfStroke = borderWidth / 2;

    const border = new fabric.Rect({
      left: margin + halfStroke,
      top: margin + halfStroke,
      width: width - margin * 2 - borderWidth,
      height: height - margin * 2 - borderWidth,
      fill: 'transparent',
      stroke: style.borderColor || '#000000',
      strokeWidth: borderWidth,
      strokeUniform: true,
      selectable: false,
    });

    fabricCanvas.add(border);
  }

  // 🎯 Code-barres avec gestion d'erreur tolérante
  async _addBarcode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    try {
      const barcodeCanvas = document.createElement('canvas');
      const barcodeWidth = Math.min(element.width - 10 * scaleFactor, 150 * scaleFactor);

      barcodeCanvas.width = barcodeWidth;
      barcodeCanvas.height = element.barcodeHeight;

      // 🎯 Tentative de génération code-barres
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

      // Image du code-barres
      const barcodeImg = new fabric.Image(barcodeCanvas, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        selectable: false,
        imageSmoothing: false,
      });
      fabricCanvas.add(barcodeImg);

      // Texte du code-barres
      const barcodeText = new fabric.Text(this._formatBarcodeText(label.barcode), {
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
      // 🎯 Fallback silencieux - affichage texte simple
      console.warn(`Code-barres invalide pour ${label.name}:`, error.message);

      const fallbackText = new fabric.Text(label.barcode, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        fontSize: 10 * scaleFactor,
        fontFamily: 'Arial',
        fill: '#666666',
        selectable: false,
      });
      fabricCanvas.add(fallbackText);
    }
  }

  // 🎯 Formatage code-barres simplifié
  _formatBarcodeText(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }

  // 🚀 Utilitaires optimisés
  _prepareDuplicatedLabels(labelData, duplicateCount) {
    return labelData.flatMap((label) => Array(duplicateCount).fill(label));
  }

  // 🎯 Génération d'image optimisée
  async _renderSingleLabelToCanvas(label, layout, style, context = 'print') {
    const tempCanvas = document.createElement('canvas');
    try {
      const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
        highRes: true,
        context: context,
      });

      const canvasElement = fabricCanvas.toCanvasElement();
      const imgData = canvasElement.toDataURL('image/png', 1.0);

      fabricCanvas.dispose();
      return imgData;
    } catch (error) {
      console.error(`❌ Erreur génération ${context}:`, error);
      throw error;
    }
  }
}

export default BaseLabelRenderer;

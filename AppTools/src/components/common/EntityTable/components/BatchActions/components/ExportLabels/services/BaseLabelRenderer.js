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

    // NOUVELLE LOGIQUE : marge latérale uniquement pour les rouleaux
    const isRouleau = layout.supportType === 'rouleau';
    const lateralMargin = isRouleau ? layout.padding || 2 : layout.padding || 2;
    const paddingH = lateralMargin * this.mmToPx * scaleFactor;
    const paddingV = isRouleau ? 0 : lateralMargin * this.mmToPx * scaleFactor;

    const contentWidth = canvasWidth - paddingH * 2;

    const elements = {};
    let currentY = paddingV;
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
        x: paddingH,
        y: currentY,
        width: contentWidth,
        height,
        centerX: paddingH + contentWidth / 2,
      };

      currentY += height + spacing;
      return element;
    };

    // Reste du code identique...
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
            x: paddingH,
            y: canvasHeight - paddingV - totalHeight,
            width: contentWidth,
            height: totalHeight,
            centerX: paddingH + contentWidth / 2,
          };

      elements.barcode.barcodeHeight = barcodeHeight;
      elements.barcode.textHeight = textHeight;
    }

    return elements;
  }

  // 🎨 Ajout de texte unifié
  async _addText(fabricCanvas, text, element, style, fabric, type) {
    let fontWeight = 'normal';

    if (type === 'price') {
      fontWeight = style.priceWeight || 'bold';
    } else if (type === 'name') {
      fontWeight = style.nameWeight || 'bold';
    }

    const textObj = new fabric.Text(text, {
      left: element.centerX,
      top: element.y,
      originX: 'center',
      fontSize: element.fontSize,
      fontFamily: style.fontFamily || 'Arial',
      fontWeight: fontWeight,
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
    const borderWidth = (style.borderWidth || 1) * this.mmToPx * scaleFactor * 2; // x2 plus épais
    const offset = borderWidth; // Décalage complet au lieu de halfStroke

    const border = new fabric.Rect({
      left: offset,
      top: offset,
      width: width - offset * 2,
      height: height - offset * 2,
      fill: 'transparent',
      stroke: style.borderColor || '#000000',
      strokeWidth: borderWidth,
      strokeUniform: true,
      selectable: false,
    });

    fabricCanvas.add(border);
  }

  // 🎯 Code-barres avec réduction proportionnelle de la largeur
  async _addBarcode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    try {
      const barcodeCanvas = document.createElement('canvas');

      // 🎯 LARGEUR PROPORTIONNELLE CONTINUE
      const widthPercentage = (style.barcodeWidth || 60) / 100;
      const availableWidth = element.width - 10 * scaleFactor;
      const barcodeWidth = availableWidth * widthPercentage;

      barcodeCanvas.width = barcodeWidth;
      barcodeCanvas.height = element.barcodeHeight;

      // 🎯 LARGEUR DES BARRES PROPORTIONNELLE ET CONTINUE
      let barWidth;
      if (widthPercentage <= 0.5) {
        barWidth = 0.6 + (widthPercentage - 0.4) * 2;
      } else if (widthPercentage <= 0.7) {
        barWidth = 0.8 + (widthPercentage - 0.5) * 1;
      } else {
        barWidth = 1.0 + (widthPercentage - 0.7) * 0.67;
      }

      barWidth *= scaleFactor;

      JsBarcode(barcodeCanvas, label.barcode, {
        format: 'EAN13',
        width: barWidth,
        height: element.barcodeHeight * 0.85,
        displayValue: false,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 0,
        flat: true,
      });

      // Image du code-barres (centrée)
      const barcodeImg = new fabric.Image(barcodeCanvas, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        selectable: false,
        imageSmoothing: false,
      });
      fabricCanvas.add(barcodeImg);

      // ⭐ LOGIQUE CONDITIONNELLE : Texte du code-barres seulement si activé
      if (style.showBarcodeText !== false) {
        const fontSize = (style.barcodeTextSize || 8) * scaleFactor;
        const barcodeText = new fabric.Text(this._formatBarcodeText(label.barcode), {
          left: element.centerX,
          top: element.y + element.barcodeHeight + 1 * scaleFactor,
          originX: 'center',
          fontSize: fontSize,
          fontFamily: 'Arial',
          fill: '#000000',
          selectable: false,
          paintFirst: 'fill',
        });
        fabricCanvas.add(barcodeText);
      }
    } catch (error) {
      console.warn(`Code-barres invalide pour ${label.name}:`, error.message);

      const fallbackText = new fabric.Text(label.barcode, {
        left: element.centerX,
        top: element.y,
        originX: 'center',
        fontSize: 9 * scaleFactor,
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

      // Cela évite les marges automatiques ajoutées par Fabric.js
      const imgData = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1, // Pas de sur-échantillonnage
        left: 0, // Départ exact à 0
        top: 0, // Départ exact à 0
        width: fabricCanvas.width, // Largeur exacte du canvas
        height: fabricCanvas.height, // Hauteur exacte du canvas
      });

      fabricCanvas.dispose();
      return imgData;
    } catch (error) {
      console.error(`❌ Erreur génération ${context}:`, error);
      throw error;
    }
  }
}

export default BaseLabelRenderer;

//AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\services\BaseLabelRenderer.js
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../../../../../../../utils/formatters.js';

/**
 * Classe de base pour le rendu d'étiquettes
 * CORRIGÉ : Canvas 200 DPI, éléments taille normale
 */
class BaseLabelRenderer {
  constructor() {
    // ✅ GARDER la logique 96 DPI existante
    this.mmToPx = 3.779527559;
    this.pxToMm = 1 / this.mmToPx;

    // 🎯 FACTEURS D'ÉCHELLE
    this.DISPLAY_SCALE = 1; // 96 DPI pour affichage
    this.PRINT_SCALE = 200 / 96; // 2.083 pour impression (200 DPI)
    this.EXPORT_SCALE = 200 / 96; // 2.083 pour PDF (200 DPI)

    console.log("🎯 Facteurs d'échelle initialisés:", {
      Display: this.DISPLAY_SCALE,
      Print: this.PRINT_SCALE.toFixed(3),
      Export: this.EXPORT_SCALE.toFixed(3),
    });
  }

  // Déterminer le facteur d'échelle selon le contexte
  getScaleFactorForContext(context = 'display') {
    switch (context) {
      case 'print':
        return this.PRINT_SCALE;
      case 'export':
      case 'pdf':
        return this.EXPORT_SCALE;
      case 'display':
      case 'preview':
      default:
        return this.DISPLAY_SCALE;
    }
  }

  //Rendu d'une étiquette sur canvas Fabric.js - CORRIGÉ
  async renderToCanvas(canvasElement, label, layout, style, options = {}) {
    const fabric = await import('fabric');
    if (canvasElement.__fabricCanvas__) {
      canvasElement.__fabricCanvas__.dispose();
      canvasElement.__fabricCanvas__ = null;
    }

    const baseScaleFactor = options.highRes ? 4 : 1;
    const context = options.context || 'display';
    const contextScaleFactor = this.getScaleFactorForContext(context);

    // 🔧 CORRECTION PRINCIPALE : Séparer facteur canvas et facteur éléments
    const canvasScaleFactor = baseScaleFactor * contextScaleFactor; // Pour taille canvas (200 DPI)
    const elementScaleFactor = baseScaleFactor; // Pour éléments (taille normale)

    console.log(`🎯 Rendu corrigé ${context}:`, {
      base: baseScaleFactor,
      contexte: contextScaleFactor.toFixed(3),
      canvas: canvasScaleFactor.toFixed(3),
      éléments: elementScaleFactor.toFixed(3),
      'DPI équivalent': (96 * contextScaleFactor).toFixed(0),
    });

    // Canvas avec facteur complet (200 DPI)
    const canvasWidth = layout.width * this.mmToPx * canvasScaleFactor;
    const canvasHeight = layout.height * this.mmToPx * canvasScaleFactor;

    console.log(`📐 Canvas: ${canvasWidth.toFixed(0)}×${canvasHeight.toFixed(0)}px`);

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: false,
      enableRetinaScaling: false,
      imageSmoothingEnabled: contextScaleFactor > 1,
    });
    canvasElement.__fabricCanvas__ = fabricCanvas;

    // 🔧 ÉLÉMENTS : Calculés avec facteur normal (pas agrandi)
    const customPositions = style.customPositions || {};
    const elements = this._calculateElements(layout, style, elementScaleFactor, customPositions);

    // 🎯 TRANSFORMATION : Si 200 DPI, appliquer mise à l'échelle globale
    if (contextScaleFactor > 1) {
      // Centrer et agrandir le contenu
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const normalWidth = layout.width * this.mmToPx * elementScaleFactor;
      const normalHeight = layout.height * this.mmToPx * elementScaleFactor;

      // Calculer le décalage pour centrer
      const offsetX = (canvasWidth - normalWidth * contextScaleFactor) / 2;
      const offsetY = (canvasHeight - normalHeight * contextScaleFactor) / 2;

      console.log(
        `📍 Transformation 200 DPI: échelle ${contextScaleFactor.toFixed(2)}, décalage (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`
      );

      // Appliquer transformation globale au canvas
      fabricCanvas.viewportTransform = [
        contextScaleFactor,
        0,
        0,
        contextScaleFactor,
        offsetX,
        offsetY,
      ];
    }

    // Rendu des éléments avec taille normale
    if (style.showBorder) {
      await this._addBorder(
        fabricCanvas,
        layout.width * this.mmToPx * elementScaleFactor,
        layout.height * this.mmToPx * elementScaleFactor,
        style,
        fabric,
        elementScaleFactor,
        layout
      );
    }

    if (style.showName && label.name) {
      await this._addName(fabricCanvas, label, elements.name, style, fabric, elementScaleFactor);
    }

    if (style.showPrice && label.price !== undefined) {
      await this._addPrice(fabricCanvas, label, elements.price, style, fabric, elementScaleFactor);
    }

    if (style.showBarcode && label.barcode?.trim()) {
      await this._addBarcode(
        fabricCanvas,
        label,
        elements.barcode,
        style,
        fabric,
        elementScaleFactor
      );
    }

    fabricCanvas.renderAll();
    return fabricCanvas;
  }

  //Calcul des éléments et leur positionnement
  _calculateElements(layout, style, scaleFactor = 1, customPositions = {}) {
    const canvasWidth = layout.width * this.mmToPx * scaleFactor;
    const canvasHeight = layout.height * this.mmToPx * scaleFactor;
    const padding = (layout.padding || 2) * this.mmToPx * scaleFactor;
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

  //Ajout de la bordure
  async _addBorder(fabricCanvas, width, height, style, fabric, scaleFactor = 1, layout) {
    const borderWidth = (style.borderWidth || 1) * this.mmToPx * scaleFactor;
    const margeInterieure = (layout.padding || style.padding || 1) * this.mmToPx * scaleFactor;
    const halfStroke = borderWidth / 2;

    const border = new fabric.Rect({
      left: margeInterieure + halfStroke,
      top: margeInterieure + halfStroke,
      width: width - margeInterieure * 2 - borderWidth,
      height: height - margeInterieure * 2 - borderWidth,
      fill: 'transparent',
      stroke: style.borderColor || '#000000',
      strokeWidth: borderWidth,
      strokeUniform: true,
      selectable: false,
    });

    fabricCanvas.add(border);
  }

  //Ajout du nom/titre
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

  //Ajout du prix
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

  //Ajout du code-barres
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

  //Formatage du texte EAN13
  formatEAN13Text(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }

  //Préparation des données d'étiquettes dupliquées
  _prepareDuplicatedLabels(labelData, duplicateCount) {
    const duplicatedLabels = [];
    for (const label of labelData) {
      for (let i = 0; i < duplicateCount; i++) {
        duplicatedLabels.push(label);
      }
    }
    return duplicatedLabels;
  }

  // Rendu d'une étiquette unique sur canvas temporaire avec contexte
  async _renderSingleLabelToCanvas(label, layout, style, context = 'print') {
    const tempCanvas = document.createElement('canvas');
    try {
      console.log(`🖼️ Génération image pour: ${context}`);

      const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
        highRes: true,
        context: context,
      });

      const canvasElement = fabricCanvas.toCanvasElement();
      const imgData = canvasElement.toDataURL('image/png', 1.0);

      console.log(`✅ Image ${context} générée:`, {
        taille: `${canvasElement.width}×${canvasElement.height}px`,
        'DPI estimé': ((canvasElement.width / layout.width) * 25.4).toFixed(0),
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

// BaseLabelRenderer.js - VERSION AVEC COULEURS
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../../../../../../../utils/formatters.js';
import { QRCodeSVG } from 'qrcode.react';

class BaseLabelRenderer {
  constructor() {
    this.mmToPx = 3.779527559;

    this.SCALES = {
      display: 1,
      highRes: 200 / 96,
    };
  }

  getScaleFactor(context = 'display') {
    return context === 'display' || context === 'preview'
      ? this.SCALES.display
      : this.SCALES.highRes;
  }

  // 🎨 NOUVEAU : Helper pour obtenir la couleur d'un élément
  _getElementColor(style, elementType, defaultColor = '#000000') {
    return style.colors?.[elementType] || defaultColor;
  }

  async renderToCanvas(canvasElement, label, layout, style, options = {}) {
    const fabric = await import('fabric');

    if (canvasElement.__fabricCanvas__) {
      canvasElement.__fabricCanvas__.dispose();
      canvasElement.__fabricCanvas__ = null;
    }

    const baseScale = options.highRes ? 4 : 1;
    const contextScale = this.getScaleFactor(options.context || 'display');
    const canvasScale = baseScale * contextScale;
    const elementScale = baseScale;

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

    if (contextScale > 1) {
      const offsetX = (canvasWidth - layout.width * this.mmToPx * elementScale * contextScale) / 2;
      const offsetY =
        (canvasHeight - layout.height * this.mmToPx * elementScale * contextScale) / 2;
      fabricCanvas.viewportTransform = [contextScale, 0, 0, contextScale, offsetX, offsetY];
    }

    const elements = this._calculateElements(
      layout,
      style,
      elementScale,
      style.customPositions || {}
    );

    await this._renderElements(fabricCanvas, label, elements, style, fabric, elementScale, layout);

    fabricCanvas.renderAll();
    return fabricCanvas;
  }

  async _renderElements(fabricCanvas, label, elements, style, fabric, scaleFactor, layout) {
    // Bordure avec couleur personnalisée
    if (style.showBorder) {
      await this._addBorder(fabricCanvas, layout, style, fabric, scaleFactor);
    }

    // Nom
    if (style.showName && label.name?.trim()) {
      await this._addText(fabricCanvas, label.name, elements.name, style, fabric, 'name');
    }

    // Prix
    if (style.showPrice && label.price != null && label.price >= 0) {
      const priceText = formatCurrency(label.price);
      await this._addText(fabricCanvas, priceText, elements.price, style, fabric, 'price');
    }

    // Code-barres
    if (style.showBarcode && label.barcode?.trim()) {
      await this._addBarcode(fabricCanvas, label, elements.barcode, style, fabric, scaleFactor);
    }

    // QR Code WooCommerce
    if (style.showWooQR && label.websiteUrl?.trim()) {
      await this._addWooQRCode(fabricCanvas, label, elements.wooQR, style, fabric, scaleFactor);
    }
  }

  _calculateElements(layout, style, scaleFactor = 1, customPositions = {}) {
    const canvasWidth = layout.width * this.mmToPx * scaleFactor;
    const canvasHeight = layout.height * this.mmToPx * scaleFactor;

    const isRouleau = layout.supportType === 'rouleau';
    const lateralMargin = isRouleau ? layout.padding || 2 : layout.padding || 2;
    const paddingH = lateralMargin * this.mmToPx * scaleFactor;
    const paddingV = isRouleau ? 0 : lateralMargin * this.mmToPx * scaleFactor;

    const contentWidth = canvasWidth - paddingH * 2;

    const elements = {};
    let currentY = paddingV;
    const spacing = 8 * scaleFactor;

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

    // Name
    if (style.showName) {
      const height = Math.max(15, (style.nameSize || 10) * 1.2) * scaleFactor;
      elements.name = {
        ...createElement('name', height, customPositions.name),
        fontSize: (style.nameSize || 10) * scaleFactor,
      };
    }

    // Price
    if (style.showPrice) {
      const height = Math.max(20, (style.priceSize || 14) * 1.4) * scaleFactor;
      elements.price = {
        ...createElement('price', height, customPositions.price),
        fontSize: (style.priceSize || 14) * scaleFactor,
      };
    }

    // Barcode/QR Code
    if (style.showBarcode) {
      let totalHeight;

      if (style.barcodeType === 'qrcode') {
        const qrSize = (style.qrCodeSize || 20) * this.mmToPx * scaleFactor;
        const textHeight = style.showBarcodeText !== false ? 12 * scaleFactor : 0;
        totalHeight = qrSize + textHeight + (textHeight > 0 ? 4 * scaleFactor : 0);

        elements.barcode = customPositions.barcode
          ? createElement('barcode', totalHeight, customPositions.barcode)
          : {
              x: paddingH,
              y: canvasHeight - paddingV - totalHeight,
              width: contentWidth,
              height: totalHeight,
              centerX: paddingH + contentWidth / 2,
            };

        elements.barcode.barcodeHeight = qrSize;
      } else {
        const barcodeHeight = (style.barcodeHeight || 15) * this.mmToPx * 0.4 * scaleFactor;
        const textHeight = style.showBarcodeText !== false ? 12 * scaleFactor : 0;
        totalHeight = barcodeHeight + textHeight + (textHeight > 0 ? 4 * scaleFactor : 0);

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
      }

      elements.barcode.textHeight = style.showBarcodeText !== false ? 12 * scaleFactor : 0;
    }

    // QR Code WooCommerce
    if (style.showWooQR) {
      const qrSize = (style.wooQRSize || 10) * this.mmToPx * scaleFactor;
      const textHeight =
        style.showWooQRText !== false ? (style.wooQRTextSize || 7) * scaleFactor * 1.4 : 0;
      const totalHeight = qrSize + textHeight + (textHeight > 0 ? 2 * scaleFactor : 0);

      const defaultX = canvasWidth - paddingH - qrSize;
      const defaultY = canvasHeight - paddingV - totalHeight;

      elements.wooQR = customPositions.wooQR
        ? {
            x: customPositions.wooQR.x * this.mmToPx * scaleFactor,
            y: customPositions.wooQR.y * this.mmToPx * scaleFactor,
            width: qrSize,
            height: totalHeight,
            centerX: customPositions.wooQR.centerX * this.mmToPx * scaleFactor,
          }
        : {
            x: defaultX,
            y: defaultY,
            width: qrSize,
            height: totalHeight,
            centerX: defaultX + qrSize / 2,
          };

      elements.wooQR.qrSize = qrSize;
      elements.wooQR.textHeight = textHeight;
    }

    return elements;
  }

  // 🎨 MISE À JOUR : Ajout de texte avec couleur personnalisée
  async _addText(fabricCanvas, text, element, style, fabric, type) {
    let fontWeight = 'normal';
    let fontFamily = 'Arial';
    let textColor = '#000000'; // 🎨 Couleur par défaut

    switch (type) {
      case 'price':
        fontWeight = style.priceWeight || 'bold';
        fontFamily = style.priceFontFamily || style.fontFamily || 'Arial';
        textColor = this._getElementColor(style, 'price', '#000000'); // 🎨
        break;
      case 'name':
        fontWeight = style.nameWeight || 'bold';
        fontFamily = style.nameFontFamily || style.fontFamily || 'Arial';
        textColor = this._getElementColor(style, 'name', '#000000'); // 🎨
        break;
      case 'barcodeText':
        fontWeight = 'normal';
        fontFamily = 'Courier New';
        textColor = this._getElementColor(style, 'barcodeText', '#000000'); // 🎨
        break;
      case 'wooQRText':
        fontWeight = 'normal';
        fontFamily = 'Arial';
        textColor = this._getElementColor(style, 'wooQRText', '#000000'); // 🎨
        break;
      default:
        fontWeight = 'normal';
        fontFamily = style.fontFamily || 'Arial';
        textColor = '#000000';
    }

    const textObj = new fabric.Text(text, {
      left: element.centerX,
      top: element.y,
      originX: 'center',
      fontSize: element.fontSize,
      fontFamily: fontFamily,
      fontWeight: fontWeight,
      fill: textColor, // 🎨 Couleur appliquée
      selectable: false,
      paintFirst: 'fill',
    });

    fabricCanvas.add(textObj);
  }

  // 🎨 MISE À JOUR : Bordure avec couleur personnalisée
  async _addBorder(fabricCanvas, layout, style, fabric, scaleFactor = 1) {
    const width = layout.width * this.mmToPx * scaleFactor;
    const height = layout.height * this.mmToPx * scaleFactor;
    const borderWidth = (style.borderWidth || 1) * this.mmToPx * scaleFactor * 2;
    const offset = borderWidth;

    // 🎨 Utiliser la couleur personnalisée ou fallback sur borderColor
    const borderColor = this._getElementColor(style, 'border', style.borderColor || '#000000');

    const border = new fabric.Rect({
      left: offset,
      top: offset,
      width: width - offset * 2,
      height: height - offset * 2,
      fill: 'transparent',
      stroke: borderColor, // 🎨 Couleur appliquée
      strokeWidth: borderWidth,
      strokeUniform: true,
      selectable: false,
    });

    fabricCanvas.add(border);
  }

  // 🎨 MISE À JOUR : Code-barres avec couleur personnalisée
  async _addBarcode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    try {
      if (style.barcodeType === 'qrcode') {
        await this._addQRCode(fabricCanvas, label, element, style, fabric, scaleFactor);
      } else {
        const barcodeCanvas = document.createElement('canvas');

        const widthPercentage = (style.barcodeWidth || 60) / 100;
        const availableWidth = element.width - 10 * scaleFactor;
        const barcodeWidth = availableWidth * widthPercentage;

        barcodeCanvas.width = barcodeWidth;
        barcodeCanvas.height = element.barcodeHeight;

        let barWidth;
        if (widthPercentage <= 0.5) {
          barWidth = 0.6 + (widthPercentage - 0.4) * 2;
        } else if (widthPercentage <= 0.7) {
          barWidth = 0.8 + (widthPercentage - 0.5) * 1;
        } else {
          barWidth = 1.0 + (widthPercentage - 0.7) * 0.67;
        }

        barWidth *= scaleFactor;

        // 🎨 Couleur personnalisée pour le code-barres
        const barcodeColor = this._getElementColor(style, 'barcode', '#000000');

        JsBarcode(barcodeCanvas, label.barcode, {
          format: 'EAN13',
          width: barWidth,
          height: element.barcodeHeight * 0.85,
          displayValue: false,
          background: '#ffffff',
          lineColor: barcodeColor, // 🎨 Couleur appliquée
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
      }

      // Texte sous le code avec couleur personnalisée
      if (style.showBarcodeText !== false) {
        const fontSize = (style.barcodeTextSize || 8) * scaleFactor;
        const displayText =
          style.barcodeType === 'qrcode' ? label.barcode : this._formatBarcodeText(label.barcode);

        const textColor = this._getElementColor(style, 'barcodeText', '#000000'); // 🎨

        const barcodeText = new fabric.Text(displayText, {
          left: element.centerX,
          top: element.y + element.barcodeHeight + 1 * scaleFactor,
          originX: 'center',
          fontSize: fontSize,
          fontFamily: 'Arial',
          fill: textColor, // 🎨 Couleur appliquée
          selectable: false,
          paintFirst: 'fill',
        });
        fabricCanvas.add(barcodeText);
      }
    } catch (error) {
      console.warn(`Code invalide pour ${label.name}:`, error.message);

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

  // 🎨 MISE À JOUR : QR Code avec couleur personnalisée
  async _addQRCode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    const qrSize = (style.qrCodeSize || 20) * this.mmToPx * scaleFactor;
    const qrColor = this._getElementColor(style, 'barcode', '#000000'); // 🎨

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.pointerEvents = 'none';
      document.body.appendChild(tempContainer);

      const qrContainer = document.createElement('div');
      tempContainer.appendChild(qrContainer);

      const React = await import('react');
      const { createRoot } = await import('react-dom/client');

      const qrElement = React.createElement(QRCodeSVG, {
        value: label.barcode,
        size: Math.round(qrSize),
        level: 'M',
        includeMargin: false,
        bgColor: '#ffffff',
        fgColor: qrColor, // 🎨 Couleur appliquée
      });

      await new Promise((resolve, reject) => {
        try {
          const root = createRoot(qrContainer);
          root.render(qrElement);

          setTimeout(() => {
            try {
              const svgElement = qrContainer.querySelector('svg');
              if (svgElement) {
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const img = new Image();

                img.onload = () => {
                  const qrImage = new fabric.Image(img, {
                    left: element.centerX,
                    top: element.y,
                    originX: 'center',
                    originY: 'top',
                    selectable: false,
                  });

                  fabricCanvas.add(qrImage);
                  root.unmount();
                  document.body.removeChild(tempContainer);
                  resolve();
                };

                img.onerror = () => {
                  root.unmount();
                  document.body.removeChild(tempContainer);
                  this._addFallbackQR(fabricCanvas, element, label.barcode, fabric);
                  reject(new Error('Erreur chargement QR Code'));
                };

                img.src =
                  'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
              } else {
                root.unmount();
                document.body.removeChild(tempContainer);
                this._addFallbackQR(fabricCanvas, element, label.barcode, fabric);
                reject(new Error('SVG non généré'));
              }
            } catch (err) {
              root.unmount();
              document.body.removeChild(tempContainer);
              this._addFallbackQR(fabricCanvas, element, label.barcode, fabric);
              reject(err);
            }
          }, 100);
        } catch (err) {
          this._addFallbackQR(fabricCanvas, element, label.barcode, fabric);
          reject(err);
        }
      });
    } catch (error) {
      console.error('❌ Erreur génération QR Code:', error);
      this._addFallbackQR(fabricCanvas, element, label.barcode, fabric);
    }
  }

  // 🎨 MISE À JOUR : QR Code WooCommerce avec couleur personnalisée
  async _addWooQRCode(fabricCanvas, label, element, style, fabric, scaleFactor = 1) {
    const qrSize = element.qrSize;
    const qrColor = this._getElementColor(style, 'wooQR', '#000000'); // 🎨

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.pointerEvents = 'none';
      document.body.appendChild(tempContainer);

      const qrContainer = document.createElement('div');
      tempContainer.appendChild(qrContainer);

      const React = await import('react');
      const { createRoot } = await import('react-dom/client');

      const qrElement = React.createElement(QRCodeSVG, {
        value: label.websiteUrl,
        size: Math.round(qrSize),
        level: 'M',
        includeMargin: false,
        bgColor: '#ffffff',
        fgColor: qrColor, // 🎨 Couleur appliquée
      });

      await new Promise((resolve, reject) => {
        try {
          const root = createRoot(qrContainer);
          root.render(qrElement);

          setTimeout(() => {
            try {
              const svgElement = qrContainer.querySelector('svg');
              if (svgElement) {
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const img = new Image();

                img.onload = () => {
                  const qrImage = new fabric.Image(img, {
                    left: element.centerX || element.x + qrSize / 2,
                    top: element.y,
                    originX: 'center',
                    originY: 'top',
                    selectable: false,
                  });

                  qrImage.wooQRCode = true;
                  fabricCanvas.add(qrImage);

                  root.unmount();
                  document.body.removeChild(tempContainer);
                  resolve();
                };

                img.onerror = () => {
                  root.unmount();
                  document.body.removeChild(tempContainer);
                  this._addFallbackWooQR(
                    fabricCanvas,
                    element,
                    label.websiteUrl,
                    fabric,
                    scaleFactor
                  );
                  reject(new Error('Erreur chargement QR WooCommerce'));
                };

                img.src =
                  'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
              } else {
                root.unmount();
                document.body.removeChild(tempContainer);
                this._addFallbackWooQR(
                  fabricCanvas,
                  element,
                  label.websiteUrl,
                  fabric,
                  scaleFactor
                );
                reject(new Error('SVG non généré'));
              }
            } catch (err) {
              root.unmount();
              document.body.removeChild(tempContainer);
              this._addFallbackWooQR(fabricCanvas, element, label.websiteUrl, fabric, scaleFactor);
              reject(err);
            }
          }, 100);
        } catch (err) {
          this._addFallbackWooQR(fabricCanvas, element, label.websiteUrl, fabric, scaleFactor);
          reject(err);
        }
      });

      // Texte sous le QR Code WooCommerce avec couleur
      if (style.showWooQRText && element.textHeight > 0) {
        const fontSize = (style.wooQRTextSize || 7) * scaleFactor;
        const displayText = style.wooQRText || 'Voir en ligne';
        const textColor = this._getElementColor(style, 'wooQRText', '#000000'); // 🎨

        const wooQRText = new fabric.Text(displayText, {
          left: element.centerX || element.x + qrSize / 2,
          top: element.y + qrSize + 2 * scaleFactor,
          originX: 'center',
          fontSize: fontSize,
          fontFamily: 'Arial',
          fill: textColor, // 🎨 Couleur appliquée
          selectable: false,
          paintFirst: 'fill',
        });

        fabricCanvas.add(wooQRText);
      }
    } catch (error) {
      console.error('❌ Erreur génération QR WooCommerce:', error);
      this._addFallbackWooQR(fabricCanvas, element, label.websiteUrl, fabric, scaleFactor);
    }
  }

  _addFallbackQR(fabricCanvas, element, barcodeText, fabric) {
    const qrSize = element.barcodeHeight || 60;
    const centerX = element.centerX || element.x + qrSize / 2;

    const background = new fabric.Rect({
      left: element.centerX,
      top: element.y,
      originX: 'center',
      originY: 'top',
      width: qrSize,
      height: qrSize,
      fill: '#ffffff',
      stroke: '#0084ff',
      strokeWidth: 1,
      selectable: false,
    });
    fabricCanvas.add(background);

    const cornerSize = qrSize * 0.2;
    const positions = [
      { x: element.centerX - qrSize / 2 + cornerSize / 2, y: element.y + cornerSize / 2 },
      { x: element.centerX + qrSize / 2 - cornerSize / 2, y: element.y + cornerSize / 2 },
      { x: element.centerX - qrSize / 2 + cornerSize / 2, y: element.y + qrSize - cornerSize / 2 },
    ];

    positions.forEach((pos) => {
      const corner = new fabric.Rect({
        left: pos.x,
        top: pos.y,
        originX: 'center',
        originY: 'center',
        width: cornerSize,
        height: cornerSize,
        fill: '#000000',
        selectable: false,
      });
      fabricCanvas.add(corner);

      const innerCorner = new fabric.Rect({
        left: pos.x,
        top: pos.y,
        originX: 'center',
        originY: 'center',
        width: cornerSize * 0.4,
        height: cornerSize * 0.4,
        fill: '#ffffff',
        selectable: false,
      });
      fabricCanvas.add(innerCorner);
    });

    const centerText = new fabric.Text('QR', {
      left: element.centerX,
      top: element.y + qrSize / 2,
      originX: 'center',
      originY: 'center',
      fontSize: qrSize * 0.15,
      fontFamily: 'Arial',
      fill: '#666666',
      selectable: false,
    });
    fabricCanvas.add(centerText);
  }

  _addFallbackWooQR(fabricCanvas, element, url, fabric, scaleFactor) {
    const qrSize = element.qrSize || 60;
    const centerX = element.centerX || element.x + qrSize / 2;

    const background = new fabric.Rect({
      left: centerX,
      top: element.y,
      originX: 'center',
      originY: 'top',
      width: qrSize,
      height: qrSize,
      fill: '#ffffff',
      stroke: '#0084ff',
      strokeWidth: 1,
      selectable: false,
    });
    fabricCanvas.add(background);

    const globeText = new fabric.Text('🌐', {
      left: centerX,
      top: element.y + qrSize / 2,
      originX: 'center',
      originY: 'center',
      fontSize: qrSize * 0.4,
      selectable: false,
    });
    fabricCanvas.add(globeText);

    const webText = new fabric.Text('WEB', {
      left: centerX,
      top: element.y + qrSize * 0.75,
      originX: 'center',
      originY: 'center',
      fontSize: qrSize * 0.15,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#0084ff',
      selectable: false,
    });
    fabricCanvas.add(webText);
  }

  _formatBarcodeText(barcode) {
    const clean = barcode.replace(/[\s-]/g, '');
    if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
    if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
    if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
    return clean;
  }

  _prepareDuplicatedLabels(labelData, duplicateCount) {
    return labelData.flatMap((label) => Array(duplicateCount).fill(label));
  }

  async _renderSingleLabelToCanvas(label, layout, style, context = 'print') {
    const tempCanvas = document.createElement('canvas');
    try {
      const fabricCanvas = await this.renderToCanvas(tempCanvas, label, layout, style, {
        highRes: true,
        context: context,
      });

      const imgData = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1,
        left: 0,
        top: 0,
        width: fabricCanvas.width,
        height: fabricCanvas.height,
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

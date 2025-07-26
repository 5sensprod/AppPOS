// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportModal\components\FabricLabelCanvas.jsx
import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import JsBarcode from 'jsbarcode';
import { formatCurrency } from '../../../../../../../../utils/formatters';

const mmToPx = 3.779527559;

const formatEAN13Text = (barcode) => {
  const clean = barcode.replace(/[\s-]/g, '');
  if (/^\d{13}$/.test(clean)) return `${clean[0]} ${clean.slice(1, 7)} ${clean.slice(7)}`;
  if (/^\d{8}$/.test(clean)) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  if (/^\d{12}$/.test(clean)) return `0 ${clean.slice(0, 6)} ${clean.slice(6)}`;
  return clean;
};

const FabricLabelCanvas = ({ label, layout, style }) => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const canvasWidth = layout.width * mmToPx;
    const canvasHeight = layout.height * mmToPx;

    const canvas = new fabric.Canvas(canvasEl, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#fff',
      selection: false,
    });

    if (style.showBorder) {
      canvas.add(
        new fabric.Rect({
          left: 0,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
          fill: 'transparent',
          stroke: style.borderColor || '#000',
          strokeWidth: style.borderWidth || 1,
          selectable: false,
        })
      );
    }

    const padding = (style.padding || 1) * mmToPx;
    const contentWidth = canvasWidth - padding * 2;
    const contentHeight = canvasHeight - padding * 2;

    // ✅ CALCULS IDENTIQUES AU exportService.js
    let currentY = padding;
    const elementSpacing = 1 * mmToPx;

    // Calculs de hauteur IDENTIQUES au PDF
    const nameHeight = style.showName ? Math.max(2.5, (style.nameSize || 10) * 0.4) * mmToPx : 0;
    const priceHeight = style.showPrice ? Math.max(3, (style.priceSize || 14) * 0.4) * mmToPx : 0;
    const barcodeBarHeight = style.showBarcode ? (style.barcodeHeight || 15) * 0.3 * mmToPx : 0;
    const barcodeTextHeight = style.showBarcode ? 4 * mmToPx : 0;
    const totalBarcodeHeight = barcodeBarHeight + barcodeTextHeight;

    // Ajustement si nécessaire (logique exacte du PDF)
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
    if (style.showName && label.name) {
      const fontSize = Math.max(6, (style.nameSize || 10) * (finalNameHeight / nameHeight));

      const nameBox = new fabric.Textbox(label.name, {
        top: currentY,
        left: padding,
        width: contentWidth,
        fontSize: fontSize,
        fontWeight: 'bold',
        fontFamily: style.fontFamily || 'Arial',
        fill: '#000',
        textAlign: 'center',
        selectable: false,
      });
      canvas.add(nameBox);
      currentY += finalNameHeight + elementSpacing;
    }

    // Prix
    if (style.showPrice && label.price !== undefined) {
      // ✅ Utilisation de formatCurrency au lieu du formatage manuel
      const priceText = formatCurrency(label.price);
      const fontSize = Math.max(8, (style.priceSize || 14) * (finalPriceHeight / priceHeight));

      const price = new fabric.Text(priceText, {
        top: currentY,
        left: canvasWidth / 2,
        originX: 'center',
        fontSize: fontSize,
        fontFamily: style.fontFamily || 'Arial',
        fontWeight: 'bold',
        fill: '#000',
        selectable: false,
      });
      canvas.add(price);
      currentY += finalPriceHeight + elementSpacing;
    }
    // Code-barres
    if (style.showBarcode && label.barcode) {
      // ✅ CALCUL DYNAMIQUE IDENTIQUE AU exportService.js
      const userBarcodeHeight = (style.barcodeHeight || 15) * 0.3 * mmToPx; // ✅ Même formule que le PDF
      const targetBarcodeWidth = Math.min(contentWidth - 1 * mmToPx, 35 * mmToPx); // ✅ Même formule que le PDF

      const temp = document.createElement('canvas');
      temp.width = targetBarcodeWidth * 4; // ✅ Même résolution que le PDF
      temp.height = userBarcodeHeight * 4;

      JsBarcode(temp, label.barcode, {
        format: 'EAN13',
        width: 2, // ✅ Même paramètre que le PDF
        height: userBarcodeHeight * 3, // ✅ Même calcul que le PDF
        displayValue: false,
        background: '#ffffff',
        lineColor: '#000000',
        margin: 2, // ✅ Même marge que le PDF
      });

      // ✅ POSITION EN BAS comme dans le PDF
      const barcodeY = padding + contentHeight - totalBarcodeHeight;

      const img = new fabric.Image(temp, {
        top: barcodeY,
        left: (canvasWidth - targetBarcodeWidth) / 2,
        scaleX: targetBarcodeWidth / temp.width,
        scaleY: userBarcodeHeight / temp.height,
        selectable: false,
      });

      canvas.add(img);

      // Texte sous le code-barres
      const barcodeText = new fabric.Text(formatEAN13Text(label.barcode), {
        fontFamily: 'arial', // ✅ Même police que le PDF
        fontSize: Math.max(7, 9), // ✅ Même taille que le PDF
        fill: '#000',
        left: canvasWidth / 2,
        top: barcodeY + userBarcodeHeight + 3, // ✅ Même espacement que le PDF
        originX: 'center',
        selectable: false,
      });

      canvas.add(barcodeText);
    }

    return () => {
      canvas.dispose();
    };
  }, [label, layout, style]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${layout.width * mmToPx}px`,
        height: `${layout.height * mmToPx}px`,
        border: '1px solid #ccc',
      }}
    />
  );
};

export default FabricLabelCanvas;

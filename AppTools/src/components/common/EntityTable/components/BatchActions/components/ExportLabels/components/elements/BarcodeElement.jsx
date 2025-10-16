// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\elements\BarcodeElement.jsx
import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import JsBarcode from 'jsbarcode';

export function BarcodeElement({
  value,
  x,
  y,
  targetWidth, // Largeur cible finale
  height,
  color = '#000000',
  displayValue = false,
  draggable = false,
  onDragEnd,
}) {
  const [dataURL, setDataURL] = React.useState(null);

  React.useEffect(() => {
    if (!value) return;

    try {
      const canvas = document.createElement('canvas');

      // 🎯 SIMPLE : Laisser JsBarcode calculer sa propre largeur naturelle
      // avec width=2 (barres standard)
      JsBarcode(canvas, value, {
        format: 'EAN13',
        width: 2,
        height: height * 0.85,
        displayValue: false,
        background: '#ffffff',
        lineColor: color,
        margin: 0,
        flat: true,
      });

      setDataURL(canvas.toDataURL());
    } catch (err) {
      console.error('Erreur génération barcode:', err);
    }
  }, [value, height, color, displayValue]);

  const [image] = useImage(dataURL);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={targetWidth}
      height={height}
      draggable={draggable}
      onDragEnd={onDragEnd}
    />
  );
}

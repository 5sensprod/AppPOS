// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\elements\QRElement.jsx
import React from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import QRCode from 'qrcode';

export function QRElement({ value, x, y, size, color = '#000000', draggable = false, onDragEnd }) {
  const [dataURL, setDataURL] = React.useState(null);

  // Générer le QR code
  React.useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: Math.round(size),
      margin: 0,
      color: {
        dark: color,
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        setDataURL(url);
      })
      .catch((err) => {
        console.error('Erreur génération QR:', err);
      });
  }, [value, size, color]);

  // useImage gère le cache automatiquement !
  const [image] = useImage(dataURL);

  if (!image) return null;

  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={size}
      height={size}
      draggable={draggable}
      onDragEnd={onDragEnd}
    />
  );
}

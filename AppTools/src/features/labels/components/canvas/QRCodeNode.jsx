// AppTools/src/features/labels/components/canvas/QRCodeNode.jsx
import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import QRCode from 'qrcode';
import useImage from 'use-image';

const QRCodeNode = ({
  id,
  x = 0,
  y = 0,
  size = 160,
  color = '#000000',
  bgColor = '#FFFFFF00',
  qrValue = '',
  draggable = false,
  onClick,
  onDragEnd,
  onTransformEnd,
  scaleX = 1,
  scaleY = 1,
  rotation = 0,
  opacity = 1,
}) => {
  const [dataUrl, setDataUrl] = useState(null);
  const [img] = useImage(dataUrl, 'anonymous');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = await QRCode.toDataURL(qrValue || '', {
          width: size,
          margin: 1,
          color: { dark: color, light: bgColor },
          errorCorrectionLevel: 'M',
        });
        if (mounted) setDataUrl(url);
      } catch (e) {
        console.error('QR generation failed', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [qrValue, size, color, bgColor]);

  if (!img) return null;

  return (
    <KonvaImage
      id={id}
      x={x}
      y={y}
      image={img}
      width={size}
      height={size}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      scaleX={scaleX}
      scaleY={scaleY}
      rotation={rotation}
      opacity={opacity}
    />
  );
};

export default QRCodeNode;

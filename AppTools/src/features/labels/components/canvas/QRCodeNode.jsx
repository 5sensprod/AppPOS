// AppTools/src/features/labels/components/canvas/QRCodeNode.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import QRCode from 'qrcode';

/**
 * QRCodeNode - Composant Konva pour afficher un QR code
 *
 * FIX DU BUG TRANSFORMER :
 * - On retourne TOUJOURS un Group (jamais null)
 * - On met à jour l'image en interne sans démonter le node
 * - Le Transformer garde sa référence stable
 *
 * ✨ AMÉLIORATION QUALITÉ :
 * - QR générés à 2x la taille d'affichage pour netteté maximale
 * - ErrorCorrectionLevel 'H' pour meilleure lecture
 * - Marge augmentée pour éviter le clipping
 */
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
  const [imageObj, setImageObj] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const generateQR = async () => {
      try {
        // ✨ AMÉLIORATION : Générer à 2x la résolution pour l'affichage
        // Encore plus net à l'écran et prêt pour l'export
        const displayResolution = Math.max(256, Math.floor(size * 2));

        const dataUrl = await QRCode.toDataURL(qrValue || 'https://example.com', {
          width: displayResolution, // 🔥 2x plus grand
          margin: 2, // 🔥 Marge augmentée
          color: { dark: color, light: bgColor },
          errorCorrectionLevel: 'H', // 🔥 Correction maximale
          type: 'image/png',
          rendererOpts: {
            quality: 1.0, // Qualité maximale
          },
        });

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          if (mounted) {
            setImageObj(img);
            // Force re-render du node Konva
            if (imageRef.current) {
              imageRef.current.getLayer()?.batchDraw();
            }
          }
        };

        img.onerror = (e) => {
          console.error('QR image loading failed', e);
        };

        img.src = dataUrl;
      } catch (e) {
        console.error('QR generation failed', e);
      }
    };

    generateQR();

    return () => {
      mounted = false;
    };
  }, [qrValue, size, color, bgColor]);

  // ✅ TOUJOURS retourner un Group, même si l'image n'est pas encore chargée
  return (
    <Group
      id={id}
      x={x}
      y={y}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      scaleX={scaleX}
      scaleY={scaleY}
      rotation={rotation}
      opacity={opacity}
    >
      {imageObj && <KonvaImage ref={imageRef} image={imageObj} width={size} height={size} />}
    </Group>
  );
};

export default QRCodeNode;

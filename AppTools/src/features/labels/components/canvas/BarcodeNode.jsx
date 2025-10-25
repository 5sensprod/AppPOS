// src/features/labels/components/canvas/BarcodeNode.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import JsBarcode from 'jsbarcode';

/**
 * BarcodeNode - Composant Konva pour afficher un code-barres
 * - L'ID + handlers restent sur le Group (pour le Transformer)
 * - L'ombre est appliquée sur le KonvaImage interne (car le Group ne dessine pas)
 */
const BarcodeNode = ({
  id,
  x,
  y,
  width = 200,
  height = 80,
  barcodeValue = '',
  format = 'CODE128',
  displayValue = true,
  fontSize = 14,
  textMargin = 2,
  margin = 10,
  background = '#FFFFFF',
  lineColor = '#000000',
  ...rest
}) => {
  const [imageObj, setImageObj] = useState(null);
  const imageRef = useRef(null);

  // --- extraire les props d'ombre pour les passer au KonvaImage ---
  const {
    shadowEnabled,
    shadowColor,
    shadowOpacity,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    ...groupRest
  } = rest;

  useEffect(() => {
    let mounted = true;

    const generateBarcode = () => {
      try {
        const canvas = document.createElement('canvas');
        const value = barcodeValue || '000000000000';

        JsBarcode(canvas, value, {
          format,
          width: 2,
          height: height - (displayValue ? fontSize + textMargin * 2 : 0),
          displayValue,
          fontSize,
          textMargin,
          margin,
          background,
          lineColor,
          valid: (valid) => {
            if (!valid) {
              console.warn('⚠️ Code-barres invalide:', value, 'format:', format);
            }
          },
        });

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (mounted) {
            setImageObj(img);
            imageRef.current?.getLayer()?.batchDraw();
          }
        };
        img.onerror = (e) => {
          console.error('❌ Erreur chargement image code-barres:', e);
        };
        img.src = canvas.toDataURL('image/png');
      } catch (err) {
        console.error('❌ Erreur génération code-barres:', err);
      }
    };

    generateBarcode();
    return () => {
      mounted = false;
    };
  }, [
    barcodeValue,
    format,
    width,
    height,
    displayValue,
    fontSize,
    textMargin,
    margin,
    background,
    lineColor,
  ]);

  return (
    <Group id={id} x={x} y={y} {...groupRest}>
      {imageObj && (
        <KonvaImage
          ref={imageRef}
          image={imageObj}
          width={width}
          height={height}
          // 🟣 Ombres sur l'image (pas sur le Group)
          shadowEnabled={shadowEnabled}
          shadowColor={shadowColor}
          shadowOpacity={shadowOpacity}
          shadowBlur={shadowBlur}
          shadowOffsetX={shadowOffsetX}
          shadowOffsetY={shadowOffsetY}
        />
      )}
    </Group>
  );
};

export default BarcodeNode;

// src/features/labels/components/canvas/BarcodeNode.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Group, Image as KonvaImage } from 'react-konva';
import JsBarcode from 'jsbarcode';

/**
 * BarcodeNode - Composant Konva pour afficher un code-barres
 * Utilise JsBarcode pour générer le code-barres en SVG puis le convertit en image
 *
 * FIX DU BUG TRANSFORMER :
 * - Utilise un Group stable qui reste toujours monté
 * - L'image se met à jour en interne sans démonter le node
 * - Le Transformer garde sa référence stable
 */
const BarcodeNode = ({
  id,
  x = 0,
  y = 0,
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
  draggable = false,
  onClick,
  onDragStart, // 🆕 Ajouté pour les guides
  onDragMove, // 🆕 Ajouté pour les guides
  onDragEnd,
  onTransform, // 🆕 Ajouté pour les guides pendant resize
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

    const generateBarcode = () => {
      try {
        // Créer un canvas temporaire pour JsBarcode
        const canvas = document.createElement('canvas');

        // Valeur par défaut si vide
        const value = barcodeValue || '000000000000';

        // Générer le code-barres avec JsBarcode
        JsBarcode(canvas, value, {
          format: format,
          width: 2, // Largeur des barres
          height: height - (displayValue ? fontSize + textMargin * 2 : 0), // Hauteur des barres
          displayValue: displayValue,
          fontSize: fontSize,
          textMargin: textMargin,
          margin: margin,
          background: background,
          lineColor: lineColor,
          valid: (valid) => {
            if (!valid) {
              console.warn('⚠️ Code-barres invalide:', value, 'format:', format);
            }
          },
        });

        // Convertir le canvas en Image
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

  // ✅ TOUJOURS retourner un Group, même si l'image n'est pas encore chargée
  return (
    <Group
      id={id}
      x={x}
      y={y}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
      scaleX={scaleX}
      scaleY={scaleY}
      rotation={rotation}
      opacity={opacity}
    >
      {imageObj && <KonvaImage ref={imageRef} image={imageObj} width={width} height={height} />}
    </Group>
  );
};

export default BarcodeNode;

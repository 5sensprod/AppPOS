// src/features/labels/components/canvas/ImageNode.jsx
import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

/**
 * ImageNode - Composant Konva pour afficher une image
 * Gère le chargement et l'affichage d'images uploadées
 */
const ImageNode = ({
  id,
  x = 0,
  y = 0,
  width = 160,
  height = 160,
  src = '',
  draggable = false,
  onClick,
  onDragEnd,
  onTransformEnd,
  scaleX = 1,
  scaleY = 1,
  rotation = 0,
  opacity = 1,
}) => {
  const [image] = useImage(src, 'anonymous');

  if (!image) {
    // Placeholder pendant le chargement
    return null;
  }

  return (
    <KonvaImage
      id={id}
      x={x}
      y={y}
      image={image}
      width={width}
      height={height}
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

export default ImageNode;

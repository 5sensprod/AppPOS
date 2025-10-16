// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\elements\TextElement.jsx
import React from 'react';
import { Text } from 'react-konva';

export function TextElement({
  text,
  x,
  y,
  fontSize = 12,
  fontFamily = 'Arial',
  fontWeight = 'normal',
  color = '#000000',
  align = 'left',
  draggable = false,
  onDragEnd,
}) {
  return (
    <Text
      text={text}
      x={x}
      y={y}
      fontSize={fontSize}
      fontFamily={fontFamily}
      fontStyle={fontWeight}
      fill={color}
      align={align}
      draggable={draggable}
      onDragEnd={onDragEnd}
    />
  );
}

import React, { useRef, useCallback, useEffect } from 'react';
import { Text } from 'react-konva';
import useLabelStore from '../../store/useLabelStore';

/**
 * Text Konva avec édition inline au double-clic (overlay <textarea>).
 * - Désactivé si el.dataBinding est défini (car la valeur vient des données).
 */
const TextNode = ({
  id,
  x,
  y,
  text,
  fontSize = 16,
  fontStyle = 'normal',
  fill = '#000000',
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  opacity = 1,
  draggable = true,
  locked = false,
  dataBinding = null,
  shadowEnabled,
  shadowColor,
  shadowOpacity,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  onClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransform,
  onTransformEnd,
}) => {
  const textRef = useRef(null);
  const updateElement = useLabelStore((s) => s.updateElement);

  // Empêche la sélection de texte par le navigateur pendant le drag
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    const stage = node.getStage();
    if (!stage) return;
    const container = stage.container();
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
  }, []);

  const commit = useCallback(
    (value) => {
      updateElement(id, { text: value });
    },
    [id, updateElement]
  );

  const startEditing = useCallback(
    (e) => {
      if (locked) return;
      if (dataBinding) return; // contenu piloté par les données → pas d'édition manuelle

      const node = textRef.current;
      const stage = node.getStage();
      const layer = node.getLayer();
      if (!stage || !layer) return;

      // Position absolue du Text dans le stage (tient compte du zoom via Group)
      const absPos = node.getAbsolutePosition();
      const scale = node.getAbsoluteScale().x; // on suppose scaleX=scaleY
      const stageBox = stage.container().getBoundingClientRect();

      // Crée le textarea
      const textarea = document.createElement('textarea');
      textarea.value = node.text();
      textarea.style.position = 'absolute';
      textarea.style.top = `${stageBox.top + absPos.y}px`;
      textarea.style.left = `${stageBox.left + absPos.x}px`;
      textarea.style.padding = '0';
      textarea.style.margin = '0';
      textarea.style.border = '1px solid rgba(0,0,0,0.2)';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.background = 'white';
      textarea.style.opacity = '1';
      textarea.style.fontSize = `${fontSize * scale}px`;
      textarea.style.fontFamily = 'sans-serif';
      textarea.style.lineHeight = '1.2';
      textarea.style.color = fill;
      textarea.style.transformOrigin = 'left top';
      textarea.style.transform = `rotate(${rotation}deg)`;
      textarea.style.zIndex = '9999';

      // Largeur/hauteur approximatives : on peut partir de la bbox du node
      const nodeBox = node.getClientRect({ relativeTo: stage });
      const minWidth = 50 * scale;
      textarea.style.width = `${Math.max(nodeBox.width, minWidth)}px`;
      textarea.style.height = `${Math.max(nodeBox.height, fontSize * 1.4) * scale}px`;

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      // Masquer temporairement le node pour que le textarea le remplace visuellement
      node.visible(false);
      layer.draw();

      const end = (save) => {
        if (save) {
          commit(textarea.value);
        }
        textarea.parentNode && textarea.parentNode.removeChild(textarea);
        node.visible(true);
        layer.draw();
      };

      textarea.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' && !evt.shiftKey) {
          evt.preventDefault();
          end(true);
        } else if (evt.key === 'Escape') {
          end(false);
        }
      });
      textarea.addEventListener('blur', () => end(true));
    },
    [commit, fill, fontSize, locked, rotation, dataBinding]
  );

  return (
    <Text
      ref={textRef}
      id={id}
      x={x}
      y={y}
      text={text}
      fontSize={fontSize}
      fontStyle={fontStyle}
      fill={fill}
      rotation={rotation}
      scaleX={scaleX}
      scaleY={scaleY}
      opacity={opacity}
      draggable={draggable && !locked}
      shadowEnabled={shadowEnabled}
      shadowColor={shadowColor}
      shadowOpacity={shadowOpacity}
      shadowBlur={shadowBlur}
      shadowOffsetX={shadowOffsetX}
      shadowOffsetY={shadowOffsetY}
      onDblClick={startEditing}
      onClick={onClick}
      onTap={startEditing} // bonus mobile (tap prolongé non géré ici)
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransform={onTransform}
      onTransformEnd={onTransformEnd}
    />
  );
};

export default TextNode;

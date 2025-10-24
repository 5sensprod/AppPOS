import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Group, Rect, Text, Transformer } from 'react-konva';
import useLabelStore from '../store/useLabelStore';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const KonvaCanvas = ({
  viewportWidth = 0,
  viewportHeight = 0,
  docWidth = 800,
  docHeight = 600,
  zoom = 1,
  onDocNode, // ⬅️ pour l'export PDF
}) => {
  const elements = useLabelStore((state) => state.elements);
  const selectedId = useLabelStore((state) => state.selectedId);
  const selectElement = useLabelStore((state) => state.selectElement);
  const updateElement = useLabelStore((state) => state.updateElement);
  const setZoom = useLabelStore((state) => state.setZoom);

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const docGroupRef = useRef(null);

  // Remonte le node "document" vers le parent pour export PDF
  useEffect(() => {
    if (onDocNode) onDocNode(docGroupRef.current || null);
  }, [onDocNode, zoom]); // notifie aussi si le scale change

  // Position du document (Group)
  const [docPos, setDocPos] = useState({ x: 0, y: 0 });

  // États de pan
  const [panEnabled, setPanEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const panLast = useRef({ x: 0, y: 0 });

  // Centrer le document dans le viewport
  const centerDocument = (scale = zoom) => {
    if (!viewportWidth || !viewportHeight) return;
    setDocPos({
      x: (viewportWidth - docWidth * scale) / 2,
      y: (viewportHeight - docHeight * scale) / 2,
    });
  };

  useEffect(() => {
    centerDocument();
  }, [viewportWidth, viewportHeight, docWidth, docHeight]);

  // Zoom (simple)
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const scaleBy = 1.08;
    const newZoom = clamp(direction > 0 ? zoom / scaleBy : zoom * scaleBy, 0.1, 3);
    setZoom(newZoom);
    centerDocument(newZoom);
  };

  // Espace = pan (évite scroll de page)
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setPanEnabled(true);
      }
    };
    const up = (e) => {
      if (e.code === 'Space') {
        setPanEnabled(false);
        setIsDragging(false);
      }
    };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Curseur
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const c = stage.container();
    if (isDragging) c.style.cursor = 'grabbing';
    else if (panEnabled) c.style.cursor = 'grab';
    else c.style.cursor = 'default';
  }, [panEnabled, isDragging]);

  // Pan : MouseDown
  const onStageMouseDown = (e) => {
    const isMiddle = e.evt.button === 1;
    if (panEnabled || isMiddle) {
      setIsDragging(true);
      const pos = stageRef.current?.getPointerPosition() || { x: 0, y: 0 };
      panLast.current = pos;
    }
  };

  // Pan : Move
  const onStageMouseMove = () => {
    if (!isDragging) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition() || { x: 0, y: 0 };
    const dx = pos.x - panLast.current.x;
    const dy = pos.y - panLast.current.y;
    panLast.current = pos;
    setDocPos((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  // Pan : Up
  const onStageMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleSelect = (id, locked) => {
    if (panEnabled || isDragging) return;
    if (!locked) selectElement(id);
  };

  const handleTransform = (id, node) => {
    updateElement(id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
  };

  // Transformer
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || !selectedId) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }
    const selectedElement = elements.find((el) => el.id === selectedId);
    if (!selectedElement || selectedElement.locked || selectedElement.visible === false) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  const stageW = Math.max(1, viewportWidth);
  const stageH = Math.max(1, viewportHeight);

  return (
    <Stage
      ref={stageRef}
      width={stageW}
      height={stageH}
      onWheel={handleWheel}
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
      onClick={(e) => {
        if (panEnabled || isDragging) return;
        if (e.target === e.target.getStage()) selectElement(null);
      }}
    >
      <Layer listening={false} hitGraphEnabled={false} perfectDrawEnabled={false}>
        <Group x={docPos.x} y={docPos.y} scaleX={zoom} scaleY={zoom}>
          <Rect
            x={0}
            y={0}
            width={docWidth}
            height={docHeight}
            fill="#ffffff"
            stroke="#d1d5db"
            strokeWidth={1 / zoom}
            listening={false}
          />
        </Group>
      </Layer>
      <Layer perfectDrawEnabled={false}>
        <Group ref={docGroupRef} x={docPos.x} y={docPos.y} scaleX={zoom} scaleY={zoom}>
          {/* Éléments */}
          {elements.map((el) => {
            if (el.visible === false) return null;
            if (el.type === 'text') {
              return (
                <Text
                  key={el.id}
                  id={el.id}
                  x={el.x}
                  y={el.y}
                  text={el.text}
                  fontSize={el.fontSize}
                  fontStyle={el.bold ? 'bold' : 'normal'}
                  fill={el.color}
                  draggable={!el.locked && !panEnabled && !isDragging}
                  onClick={() => handleSelect(el.id, el.locked)}
                  onDragEnd={(e) => !el.locked && handleTransform(el.id, e.target)}
                  onTransformEnd={(e) => !el.locked && handleTransform(el.id, e.target)}
                  scaleX={el.scaleX || 1}
                  scaleY={el.scaleY || 1}
                  rotation={el.rotation || 0}
                  opacity={el.locked ? 0.7 : 1}
                  dataBinding={el.dataBinding} // ✅ Ajout du dataBinding dans les attrs
                />
              );
            }
            return null;
          })}
        </Group>

        {/* Transformer (hors export) */}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      </Layer>

      {/* Layer d'UI non cliquable (hors export) */}
      <Layer listening={false} hitGraphEnabled={false} perfectDrawEnabled={false} />
    </Stage>
  );
};

export default KonvaCanvas;

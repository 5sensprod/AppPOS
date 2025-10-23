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
}) => {
  const elements = useLabelStore((state) => state.elements);
  const selectedId = useLabelStore((state) => state.selectedId);
  const selectElement = useLabelStore((state) => state.selectElement);
  const updateElement = useLabelStore((state) => state.updateElement);
  const setZoom = useLabelStore((state) => state.setZoom);

  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const docGroupRef = useRef(null); // le group “document” qui zoome/panne

  // Position du document (Group) pour le pan
  const [docPos, setDocPos] = useState({ x: 0, y: 0 });

  // Centre le document quand la taille viewport change ou quand zoom=1 (reset)
  useEffect(() => {
    if (!viewportWidth || !viewportHeight) return;
    const scale = zoom || 1;
    const x = (viewportWidth - docWidth * scale) / 2;
    const y = (viewportHeight - docHeight * scale) / 2;
    // On ne recentre automatiquement que si le zoom est 1 (reset) pour ne pas surprendre l’utilisateur
    if (scale === 1) setDocPos({ x, y });
  }, [viewportWidth, viewportHeight, docWidth, docHeight, zoom]);

  // Zoom molette autour du pointeur (sur le Group “doc”, pas le Stage)
  const handleWheel = (e) => {
    e.evt.preventDefault();
    if (!stageRef.current || !docGroupRef.current) return;

    const pointer = stageRef.current.getPointerPosition() || {
      x: viewportWidth / 2,
      y: viewportHeight / 2,
    };

    const oldScale = zoom;
    const mousePointTo = {
      x: (pointer.x - docPos.x) / oldScale,
      y: (pointer.y - docPos.y) / oldScale,
    };

    const scaleBy = 1.05;
    const dir = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = clamp(dir > 0 ? oldScale / scaleBy : oldScale * scaleBy, 0.1, 3);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setZoom(newScale);
    setDocPos(newPos);
  };

  // Pan avec Espace (ou clic molette)
  const [isPanning, setIsPanning] = useState(false);
  useEffect(() => {
    const down = (e) => e.code === 'Space' && setIsPanning(true);
    const up = (e) => e.code === 'Space' && setIsPanning(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);
  const onMouseDown = (e) => {
    if (e.evt.button === 1) setIsPanning(true);
  };
  const onMouseUp = (e) => {
    if (e.evt.button === 1) setIsPanning(false);
  };

  const handleSelect = (id, locked) => {
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

  const selectedElement = elements.find((el) => el.id === selectedId);

  // Transformer robuste (évite nodes [undefined])
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || !selectedId) {
      tr?.nodes([]);
      tr?.getLayer()?.batchDraw();
      return;
    }
    if (!selectedElement || selectedElement.locked || selectedElement.visible === false) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, selectedElement, elements]);

  // Taille de stage = 100% du viewport
  const stageW = Math.max(1, viewportWidth);
  const stageH = Math.max(1, viewportHeight);

  return (
    <Stage
      ref={stageRef}
      width={stageW}
      height={stageH}
      onWheel={handleWheel}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onClick={(e) => {
        if (e.target === e.target.getStage()) selectElement(null);
      }}
    >
      {/* Group “document” : zoome et panne (draggable quand panning) */}
      <Layer>
        <Group
          ref={docGroupRef}
          x={docPos.x}
          y={docPos.y}
          scaleX={zoom}
          scaleY={zoom}
          draggable={isPanning}
          dragBoundFunc={(pos) => pos} // libre
        >
          {/* Fond blanc + ombre = la preview entière */}
          <Rect
            x={0}
            y={0}
            width={docWidth}
            height={docHeight}
            fill="#ffffff"
            cornerRadius={4}
            shadowColor="rgba(0,0,0,0.25)"
            shadowBlur={30}
            shadowOffset={{ x: 0, y: 10 }}
            shadowOpacity={1}
            onMouseDown={() => selectElement(null)}
            onTouchStart={() => selectElement(null)}
          />

          {/* Contenu */}
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
                  draggable={!el.locked && !isPanning}
                  onClick={() => handleSelect(el.id, el.locked)}
                  onDragEnd={(e) => !el.locked && handleTransform(el.id, e.target)}
                  onTransformEnd={(e) => !el.locked && handleTransform(el.id, e.target)}
                  scaleX={el.scaleX || 1}
                  scaleY={el.scaleY || 1}
                  rotation={el.rotation || 0}
                  opacity={el.locked ? 0.7 : 1}
                />
              );
            }
            return null;
          })}
        </Group>

        {/* Transformer (reste hors du Group, attaché aux nodes trouvés) */}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
};

export default KonvaCanvas;

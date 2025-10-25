// src/features/labels/components/KonvaCanvas.jsx
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Stage, Layer, Group, Rect, Text, Transformer, Line } from 'react-konva';
import useLabelStore from '../store/useLabelStore';
import QRCodeNode from './canvas/QRCodeNode';
import ImageNode from './canvas/ImageNode';
import BarcodeNode from './canvas/BarcodeNode';
import { calculateSnapGuides } from '../utils/snapGuides.utils';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const KonvaCanvas = forwardRef(
  (
    { viewportWidth = 0, viewportHeight = 0, docWidth = 800, docHeight = 600, zoom = 1, onDocNode },
    ref
  ) => {
    const elements = useLabelStore((state) => state.elements);
    const selectedId = useLabelStore((state) => state.selectedId);
    const selectElement = useLabelStore((state) => state.selectElement);
    const updateElement = useLabelStore((state) => state.updateElement);
    const setZoom = useLabelStore((state) => state.setZoom);
    const canvasSize = useLabelStore((state) => state.canvasSize);

    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const docGroupRef = useRef(null);

    // Exposer la ref du Stage au parent
    useImperativeHandle(ref, () => stageRef.current, []);

    // Remonte le node "document" vers le parent pour export PDF
    useEffect(() => {
      if (onDocNode) onDocNode(docGroupRef.current || null);
    }, [onDocNode, zoom]);

    // Position du document (Group)
    const [docPos, setDocPos] = useState({ x: 0, y: 0 });

    // 🆕 Guides d'alignement
    const [snapGuides, setSnapGuides] = useState([]);
    const [isDraggingElement, setIsDraggingElement] = useState(false);

    // 🆕 Helper pour trouver un node par ID
    const findNodeById = useCallback((id) => {
      return stageRef.current?.findOne(`#${id}`);
    }, []);

    // États de pan
    const [panEnabled, setPanEnabled] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const panLast = useRef({ x: 0, y: 0 });

    // Centrer le document dans le viewport
    const centerDocument = useCallback(
      (scale = zoom) => {
        if (!viewportWidth || !viewportHeight) return;
        setDocPos({
          x: (viewportWidth - docWidth * scale) / 2,
          y: (viewportHeight - docHeight * scale) / 2,
        });
      },
      [viewportWidth, viewportHeight, docWidth, docHeight, zoom]
    );

    useEffect(() => {
      centerDocument();
    }, [viewportWidth, viewportHeight, docWidth, docHeight, centerDocument]);

    // Zoom
    const handleWheel = useCallback(
      (e) => {
        e.evt.preventDefault();
        const direction = e.evt.deltaY > 0 ? 1 : -1;
        const scaleBy = 1.08;
        const newZoom = clamp(direction > 0 ? zoom / scaleBy : zoom * scaleBy, 0.1, 3);
        setZoom(newZoom);
        centerDocument(newZoom);
      },
      [zoom, setZoom, centerDocument]
    );

    // Espace = pan
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
    const onStageMouseDown = useCallback(
      (e) => {
        const isMiddle = e.evt.button === 1;
        if (panEnabled || isMiddle) {
          setIsDragging(true);
          const pos = stageRef.current?.getPointerPosition() || { x: 0, y: 0 };
          panLast.current = pos;
        }
      },
      [panEnabled]
    );

    // Pan : Move
    const onStageMouseMove = useCallback(() => {
      if (!isDragging) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition() || { x: 0, y: 0 };
      const dx = pos.x - panLast.current.x;
      const dy = pos.y - panLast.current.y;
      panLast.current = pos;
      setDocPos((p) => ({ x: p.x + dx, y: p.y + dy }));
    }, [isDragging]);

    // Pan : Up
    const onStageMouseUp = useCallback(() => {
      if (isDragging) setIsDragging(false);
    }, [isDragging]);

    const handleSelect = useCallback(
      (id, locked) => {
        if (panEnabled || isDragging) return;
        if (!locked) selectElement(id);
      },
      [panEnabled, isDragging, selectElement]
    );

    // 🆕 Gestion du drag avec guides d'alignement
    const handleDragMove = useCallback(
      (id, node) => {
        const movingElement = elements.find((el) => el.id === id);
        if (!movingElement) return;

        // Créer un élément temporaire avec la nouvelle position
        const tempElement = {
          ...movingElement,
          x: node.x(),
          y: node.y(),
        };

        // Calculer les guides par rapport aux autres éléments
        const otherElements = elements.filter((el) => el.id !== id && el.visible !== false);

        // 🔥 Passer le node Konva et la fonction de recherche pour plus de précision
        const { guides, snapX, snapY } = calculateSnapGuides(
          tempElement,
          node, // Le node Konva en mouvement
          otherElements,
          { width: docWidth, height: docHeight },
          5, // Seuil fixe
          findNodeById // Fonction pour trouver les autres nodes
        );

        setSnapGuides(guides);

        // Appliquer le snap si nécessaire
        if (snapX !== null) node.x(snapX);
        if (snapY !== null) node.y(snapY);
      },
      [elements, docWidth, docHeight, findNodeById]
    );

    const handleDragStart = useCallback(() => {
      setIsDraggingElement(true);
    }, []);

    const handleDragEnd = useCallback(
      (id, node) => {
        setIsDraggingElement(false);
        setSnapGuides([]);
        updateElement(id, {
          x: node.x(),
          y: node.y(),
        });
      },
      [updateElement]
    );

    const handleTransform = useCallback(
      (id, node) => {
        updateElement(id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
      },
      [updateElement]
    );

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
        {/* Fond document */}
        <Layer listening={false} perfectDrawEnabled={false}>
          <Group x={docPos.x} y={docPos.y} scaleX={zoom} scaleY={zoom} listening={false}>
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

        {/* Éléments */}
        <Layer perfectDrawEnabled={false}>
          <Group ref={docGroupRef} x={docPos.x} y={docPos.y} scaleX={zoom} scaleY={zoom}>
            {elements.map((el) => {
              if (el.visible === false) return null;

              // Séparer key des autres props pour éviter le warning
              const { type, id, x, y, locked, scaleX, scaleY, rotation, ...rest } = el;

              const commonProps = {
                id,
                x,
                y,
                draggable: !locked && !panEnabled && !isDragging,
                onClick: () => handleSelect(id, locked),
                onDragStart: handleDragStart,
                onDragMove: (e) => !locked && handleDragMove(id, e.target),
                onDragEnd: (e) => !locked && handleDragEnd(id, e.target),
                onTransformEnd: (e) => !locked && handleTransform(id, e.target),
                scaleX: scaleX || 1,
                scaleY: scaleY || 1,
                rotation: rotation || 0,
                opacity: locked ? 0.7 : 1,
              };

              // TEXT
              if (type === 'text') {
                return (
                  <Text
                    key={id}
                    {...commonProps}
                    text={el.text}
                    fontSize={el.fontSize}
                    fontStyle={el.bold ? 'bold' : 'normal'}
                    fill={el.color}
                  />
                );
              }

              // QRCODE
              if (type === 'qrcode') {
                return (
                  <QRCodeNode
                    key={id}
                    {...commonProps}
                    size={el.size ?? 160}
                    color={el.color ?? '#000000'}
                    bgColor={el.bgColor ?? '#FFFFFF00'}
                    qrValue={el.qrValue ?? ''}
                  />
                );
              }

              // IMAGE
              if (type === 'image') {
                return (
                  <ImageNode
                    key={id}
                    {...commonProps}
                    width={el.width ?? 160}
                    height={el.height ?? 160}
                    src={el.src ?? ''}
                    opacity={el.opacity ?? 1}
                  />
                );
              }

              // BARCODE
              if (type === 'barcode') {
                return (
                  <BarcodeNode
                    key={id}
                    {...commonProps}
                    width={el.width ?? 200}
                    height={el.height ?? 80}
                    barcodeValue={el.barcodeValue ?? ''}
                    format={el.format ?? 'CODE128'}
                    displayValue={el.displayValue ?? true}
                    fontSize={el.fontSize ?? 14}
                    textMargin={el.textMargin ?? 2}
                    margin={el.margin ?? 10}
                    background={el.background ?? '#FFFFFF'}
                    lineColor={el.lineColor ?? '#000000'}
                  />
                );
              }

              return null;
            })}

            {/* 🆕 Guides d'alignement */}
            {isDraggingElement &&
              snapGuides.map((guide, i) => {
                if (guide.type === 'vertical') {
                  return (
                    <Line
                      key={`guide-v-${i}`}
                      points={[guide.x, guide.y1, guide.x, guide.y2]}
                      stroke="#FF00FF"
                      strokeWidth={1 / zoom}
                      dash={[4 / zoom, 4 / zoom]}
                      listening={false}
                    />
                  );
                }
                if (guide.type === 'horizontal') {
                  return (
                    <Line
                      key={`guide-h-${i}`}
                      points={[guide.x1, guide.y, guide.x2, guide.y]}
                      stroke="#FF00FF"
                      strokeWidth={1 / zoom}
                      dash={[4 / zoom, 4 / zoom]}
                      listening={false}
                    />
                  );
                }
                return null;
              })}
          </Group>

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
          />
        </Layer>

        {/* Layer d'UI non cliquable (hors export) */}
        <Layer listening={false} perfectDrawEnabled={false} />
      </Stage>
    );
  }
);

KonvaCanvas.displayName = 'KonvaCanvas';

export default KonvaCanvas;

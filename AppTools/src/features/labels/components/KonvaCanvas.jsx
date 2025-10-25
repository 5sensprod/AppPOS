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

    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const docGroupRef = useRef(null);

    useImperativeHandle(ref, () => stageRef.current, []);

    useEffect(() => {
      if (onDocNode) onDocNode(docGroupRef.current || null);
    }, [onDocNode, zoom]);

    const [docPos, setDocPos] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false); // 🆕 Flag pour initialisation unique

    const [snapGuides, setSnapGuides] = useState([]);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [rotationAngle, setRotationAngle] = useState(null); // 🆕 Angle affiché pendant la rotation

    const findNodeById = useCallback((id) => {
      return stageRef.current?.findOne(`#${id}`);
    }, []);

    const [panEnabled, setPanEnabled] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const panLast = useRef({ x: 0, y: 0 });

    // 🆕 Fonction de centrage initiale uniquement
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

    // 🆕 Centrage UNIQUEMENT au premier rendu
    useEffect(() => {
      if (!isInitialized && viewportWidth > 0 && viewportHeight > 0) {
        centerDocument();
        setIsInitialized(true);
      }
    }, [viewportWidth, viewportHeight, isInitialized, centerDocument]);

    // 🆕 Fonction pour recenter manuellement (à exposer si besoin)
    const recenterDocument = useCallback(() => {
      centerDocument(zoom);
    }, [centerDocument, zoom]);

    // 🆕 Gestion du zoom SANS recentrage automatique
    const handleWheel = useCallback(
      (e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const direction = e.evt.deltaY > 0 ? 1 : -1;
        const scaleBy = 1.08;
        const oldZoom = zoom;
        const newZoom = clamp(direction > 0 ? oldZoom / scaleBy : oldZoom * scaleBy, 0.1, 3);

        // 🎯 Zoom centré sur la position du curseur
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Calculer le point sous le curseur avant le zoom
        const mousePointTo = {
          x: (pointer.x - docPos.x) / oldZoom,
          y: (pointer.y - docPos.y) / oldZoom,
        };

        // Calculer la nouvelle position pour garder le point sous le curseur
        const newPos = {
          x: pointer.x - mousePointTo.x * newZoom,
          y: pointer.y - mousePointTo.y * newZoom,
        };

        setZoom(newZoom);
        setDocPos(newPos);
      },
      [zoom, setZoom, docPos]
    );

    useEffect(() => {
      const down = (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          setPanEnabled(true);
        }
      };
      const up = () => {
        setPanEnabled(false);
        setIsDragging(false);
      };
      window.addEventListener('keydown', down, { passive: false });
      window.addEventListener('keyup', up);
      return () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
      };
    }, []);

    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const c = stage.container();
      if (isDragging) c.style.cursor = 'grabbing';
      else if (panEnabled) c.style.cursor = 'grab';
      else c.style.cursor = 'default';
    }, [panEnabled, isDragging]);

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

    const handleDragMove = useCallback(
      (id, node) => {
        const movingElement = elements.find((el) => el.id === id);
        if (!movingElement) return;

        const tempElement = { ...movingElement, x: node.x(), y: node.y() };
        const otherElements = elements.filter((el) => el.id !== id && el.visible !== false);

        const { guides, snapX, snapY } = calculateSnapGuides(
          tempElement,
          node,
          otherElements,
          { width: docWidth, height: docHeight },
          5,
          findNodeById
        );

        setSnapGuides(guides);
        if (snapX !== null) node.x(snapX);
        if (snapY !== null) node.y(snapY);
      },
      [elements, docWidth, docHeight, findNodeById]
    );

    const handleDragStart = useCallback(() => setIsDraggingElement(true), []);
    const handleDragEnd = useCallback(
      (id, node) => {
        setIsDraggingElement(false);
        setSnapGuides([]);
        updateElement(id, { x: node.x(), y: node.y() });
      },
      [updateElement]
    );

    const handleTransforming = useCallback(
      (id, node) => {
        setIsTransforming(true);
        const movingElement = elements.find((el) => el.id === id);
        if (!movingElement) return;

        // 🎯 Arrondir la rotation à 1° (sauf si proche de 90° multiples)
        let rotation = node.rotation();
        const snapAngles = [0, 90, 180, 270, 360, -90, -180, -270];
        const snapTolerance = 5;

        // Vérifier si proche d'un angle de snap (90°)
        let snapped = false;
        for (const snapAngle of snapAngles) {
          if (Math.abs(rotation - snapAngle) < snapTolerance) {
            rotation = snapAngle;
            snapped = true;
            break;
          }
        }

        // Si pas snappé à 90°, arrondir à 1°
        if (!snapped) {
          rotation = Math.round(rotation);
        }

        // Normaliser entre -180 et 180
        if (rotation > 180) rotation -= 360;
        if (rotation < -180) rotation += 360;

        // Appliquer la rotation arrondie
        node.rotation(rotation);

        // 🆕 Afficher l'angle pendant la rotation
        setRotationAngle(rotation);

        const tempElement = {
          ...movingElement,
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        };

        const otherElements = elements.filter((el) => el.id !== id && el.visible !== false);
        const { guides } = calculateSnapGuides(
          tempElement,
          node,
          otherElements,
          { width: docWidth, height: docHeight },
          5,
          findNodeById
        );

        setSnapGuides(guides);
      },
      [elements, docWidth, docHeight, findNodeById]
    );

    const handleTransformEnd = useCallback(
      (id, node) => {
        setIsTransforming(false);
        setSnapGuides([]);
        setRotationAngle(null); // 🆕 Cacher l'indicateur d'angle

        // 🎯 Arrondir la rotation finale à 1°
        let rotation = node.rotation();
        rotation = Math.round(rotation);

        // Normaliser entre -180 et 180
        if (rotation > 180) rotation -= 360;
        if (rotation < -180) rotation += 360;

        updateElement(id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation,
        });
      },
      [updateElement]
    );

    // Ombres: helper (valeurs par défaut)
    const shadowPropsFrom = (el) => ({
      shadowEnabled: el.shadowEnabled ?? false,
      shadowColor: el.shadowColor ?? '#000000',
      shadowOpacity: el.shadowOpacity ?? 0.4,
      shadowBlur: el.shadowBlur ?? 8,
      shadowOffsetX: el.shadowOffsetX ?? 2,
      shadowOffsetY: el.shadowOffsetY ?? 2,
    });

    // Transformer: toujours cibler l'élément par son id
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

              const { type, id, x, y, locked, scaleX, scaleY, rotation } = el;

              const commonProps = {
                id,
                x,
                y,
                draggable: !locked && !panEnabled && !isDragging,
                onClick: () => handleSelect(id, locked),
                onDragStart: handleDragStart,
                onDragMove: (e) => !locked && handleDragMove(id, e.target),
                onDragEnd: (e) => !locked && handleDragEnd(id, e.target),
                onTransform: (e) => !locked && handleTransforming(id, e.target),
                onTransformEnd: (e) => !locked && handleTransformEnd(id, e.target),
                scaleX: scaleX || 1,
                scaleY: scaleY || 1,
                rotation: rotation || 0,
                opacity: locked ? 0.7 : 1,
                ...shadowPropsFrom(el),
              };

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

            {(isDraggingElement || isTransforming) &&
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

          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) return oldBox;
              return newBox;
            }}
            // 🎯 Rotation snap : angles tous les 1° + snap fort à 0°, 90°, 180°, 270°
            rotationSnaps={[0, 90, 180, 270]}
            rotationSnapTolerance={5} // Tolérance en degrés pour le snap à 90°
            // 🆕 Arrondir la rotation à 1° pendant la transformation
            rotateAnchorOffset={30}
            enabledAnchors={[
              'top-left',
              'top-center',
              'top-right',
              'middle-right',
              'middle-left',
              'bottom-left',
              'bottom-center',
              'bottom-right',
            ]}
          />

          {/* 🎯 Indicateur d'angle de rotation (style Figma/Polotno) */}
          {rotationAngle !== null && selectedId && (
            <Group>
              {(() => {
                const selectedNode = stageRef.current?.findOne(`#${selectedId}`);
                if (!selectedNode) return null;

                const box = selectedNode.getClientRect();
                const centerX = box.x + box.width / 2;
                const centerY = box.y + box.y / 2 - 40; // Au-dessus de l'élément

                return (
                  <Group x={centerX} y={centerY}>
                    <Rect
                      x={-30}
                      y={-12}
                      width={60}
                      height={24}
                      fill="#000000"
                      opacity={0.8}
                      cornerRadius={4}
                      listening={false}
                    />
                    <Text
                      x={-30}
                      y={-12}
                      width={60}
                      height={24}
                      text={`${Math.round(rotationAngle)}°`}
                      fontSize={14}
                      fontFamily="sans-serif"
                      fill="#FFFFFF"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                );
              })()}
            </Group>
          )}
        </Layer>

        <Layer listening={false} perfectDrawEnabled={false} />
      </Stage>
    );
  }
);

KonvaCanvas.displayName = 'KonvaCanvas';

export default KonvaCanvas;

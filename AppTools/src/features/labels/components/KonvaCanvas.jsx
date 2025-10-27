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
import { resolvePropForElement } from '../utils/dataBinding';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const KonvaCanvas = forwardRef(
  (
    { viewportWidth = 0, viewportHeight = 0, docWidth = 800, docHeight = 600, zoom = 1, onDocNode },
    ref
  ) => {
    const elements = useLabelStore((s) => s.elements);
    const selectedId = useLabelStore((s) => s.selectedId);
    const selectElement = useLabelStore((s) => s.selectElement);
    const updateElement = useLabelStore((s) => s.updateElement);
    const setZoom = useLabelStore((s) => s.setZoom);
    const selectedProduct = useLabelStore((s) => s.selectedProduct);
    const currentProductIndex = useLabelStore((s) => s.currentProductIndex);

    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const docGroupRef = useRef(null);

    useImperativeHandle(ref, () => stageRef.current, []);

    useEffect(() => {
      if (onDocNode) onDocNode(docGroupRef.current || null);
    }, [onDocNode, zoom]);

    const [docPos, setDocPos] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);

    const [snapGuides, setSnapGuides] = useState([]);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const [rotationAngle, setRotationAngle] = useState(null);

    const findNodeById = useCallback((id) => {
      return stageRef.current?.findOne(`#${id}`);
    }, []);

    const [panEnabled, setPanEnabled] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const panLast = useRef({ x: 0, y: 0 });

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
      if (!isInitialized && viewportWidth > 0 && viewportHeight > 0) {
        centerDocument();
        setIsInitialized(true);
      }
    }, [viewportWidth, viewportHeight, isInitialized, centerDocument]);

    const recenterDocument = useCallback(() => {
      centerDocument(zoom);
    }, [centerDocument, zoom]);

    const handleWheel = useCallback(
      (e) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const direction = e.evt.deltaY > 0 ? 1 : -1;
        const scaleBy = 1.08;
        const oldZoom = zoom;
        const newZoom = clamp(direction > 0 ? oldZoom / scaleBy : oldZoom * scaleBy, 0.1, 3);

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - docPos.x) / oldZoom,
          y: (pointer.y - docPos.y) / oldZoom,
        };

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

        let rotation = node.rotation();
        const snapAngles = [0, 90, 180, 270, 360, -90, -180, -270];
        const snapTolerance = 5;

        let snapped = false;
        for (const snapAngle of snapAngles) {
          if (Math.abs(rotation - snapAngle) < snapTolerance) {
            rotation = snapAngle;
            snapped = true;
            break;
          }
        }

        if (!snapped) {
          rotation = Math.round(rotation);
        }

        if (rotation > 180) rotation -= 360;
        if (rotation < -180) rotation += 360;

        node.rotation(rotation);
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
        setRotationAngle(null);

        let rotation = node.rotation();
        rotation = Math.round(rotation);

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

    const shadowPropsFrom = (el) => ({
      shadowEnabled: el.shadowEnabled ?? false,
      shadowColor: el.shadowColor ?? '#000000',
      shadowOpacity: el.shadowOpacity ?? 0.4,
      shadowBlur: el.shadowBlur ?? 8,
      shadowOffsetX: el.shadowOffsetX ?? 2,
      shadowOffsetY: el.shadowOffsetY ?? 2,
    });

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

    // 📝 Éditeur inline pour Text (libre) — HTML rendu HORS du <Stage>
    const [textEditor, setTextEditor] = useState({
      id: null,
      value: '',
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      fontSize: 16,
      fontWeight: 'normal',
      color: '#000000',
    });

    const openTextEditor = useCallback((el, node) => {
      if (!node || !stageRef.current) return;
      const abs = node.getAbsolutePosition();
      const rect = node.getClientRect();
      const containerRect = stageRef.current.container().getBoundingClientRect();

      setTextEditor({
        id: el.id,
        value: String(el.text ?? ''),
        x: containerRect.left + abs.x,
        y: containerRect.top + abs.y,
        w: Math.max(60, rect.width),
        h: Math.max(24, rect.height),
        fontSize: el.fontSize || 16,
        fontWeight: el.bold ? 'bold' : 'normal',
        color: el.color || '#000000',
      });
    }, []);

    const closeTextEditor = useCallback(() => {
      setTextEditor((e) => ({ ...e, id: null }));
    }, []);

    const commitTextEditor = useCallback(() => {
      if (!textEditor.id) return;
      updateElement(textEditor.id, { text: textEditor.value });
      closeTextEditor();
    }, [textEditor, updateElement, closeTextEditor]);

    return (
      <>
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

                const { type, id, x, y, locked, scaleX, scaleY, rotation, dataBinding } = el;

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

                // 🔑 clé stable si “Libre”, dépend de currentProductIndex si “Lié”
                const dynKey = dataBinding ? `${id}-${currentProductIndex}` : id;

                if (type === 'text') {
                  return (
                    <Text
                      key={dynKey}
                      {...commonProps}
                      text={resolvePropForElement(el.text, el, selectedProduct)}
                      fontSize={el.fontSize}
                      fontStyle={el.bold ? 'bold' : 'normal'}
                      fill={el.color}
                      onDblClick={(e) => {
                        if (dataBinding || locked) return; // éditable seulement si “Libre”
                        e.cancelBubble = true;
                        openTextEditor(el, e.target);
                      }}
                    />
                  );
                }

                if (type === 'qrcode') {
                  return (
                    <QRCodeNode
                      key={dynKey}
                      {...commonProps}
                      size={el.size ?? 160}
                      color={el.color ?? '#000000'}
                      bgColor={el.bgColor ?? '#FFFFFF00'}
                      qrValue={resolvePropForElement(el.qrValue, el, selectedProduct) ?? ''}
                    />
                  );
                }

                if (type === 'image') {
                  return (
                    <ImageNode
                      key={dynKey}
                      {...commonProps}
                      width={el.width ?? 160}
                      height={el.height ?? 160}
                      src={resolvePropForElement(el.src, el, selectedProduct) ?? ''}
                      opacity={el.opacity ?? 1}
                    />
                  );
                }

                if (type === 'barcode') {
                  return (
                    <BarcodeNode
                      key={dynKey}
                      {...commonProps}
                      width={el.width ?? 200}
                      height={el.height ?? 80}
                      barcodeValue={
                        resolvePropForElement(el.barcodeValue, el, selectedProduct) ?? ''
                      }
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
              rotationSnaps={[0, 90, 180, 270]}
              rotationSnapTolerance={5}
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
          </Layer>

          <Layer listening={false} perfectDrawEnabled={false} />
        </Stage>

        {/* 📝 Overlay éditeur de texte — HTML SIBLING (pas dans le <Stage>) */}
        {Boolean(textEditor.id) && (
          <textarea
            autoFocus
            value={textEditor.value}
            onChange={(e) => setTextEditor((t) => ({ ...t, value: e.target.value }))}
            onBlur={commitTextEditor}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitTextEditor();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeTextEditor();
              }
            }}
            style={{
              position: 'fixed', // on positionne par rapport à la fenêtre
              left: textEditor.x,
              top: textEditor.y,
              width: textEditor.w,
              minWidth: 60,
              height: textEditor.h,
              padding: '2px 4px',
              margin: 0,
              border: '1px solid rgba(0,0,0,.2)',
              borderRadius: 4,
              outline: 'none',
              background: 'white',
              color: textEditor.color,
              fontSize: textEditor.fontSize,
              fontWeight: textEditor.fontWeight,
              lineHeight: 1.2,
              boxShadow: '0 1px 4px rgba(0,0,0,.12)',
              zIndex: 1000,
            }}
          />
        )}
      </>
    );
  }
);

KonvaCanvas.displayName = 'KonvaCanvas';

export default KonvaCanvas;

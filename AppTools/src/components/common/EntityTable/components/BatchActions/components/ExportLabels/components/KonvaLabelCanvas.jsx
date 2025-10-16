// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\components\KonvaLabelCanvas.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { QRElement, BarcodeElement } from './elements';
import { formatCurrency } from '../../../../../../../../utils/formatters';

const KonvaLabelCanvas = ({ label, layout, style, onPositionChange, onElementSelect }) => {
  const stageRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [, forceUpdate] = useState(0);

  const mmToPx = 3.779527559;
  const isRollMode = layout.supportType === 'rouleau';

  // Dimensions
  const canvasWidth = layout.width * mmToPx;
  const canvasHeight = layout.height * mmToPx;

  // Padding
  const lateralMargin = isRollMode ? layout.padding || 2 : layout.padding || 2;
  const paddingH = lateralMargin * mmToPx;
  const paddingV = isRollMode ? 0 : lateralMargin * mmToPx;
  const contentWidth = canvasWidth - paddingH * 2;
  const centerX = paddingH + contentWidth / 2;

  // 🎯 SYSTÈME DE VARIABLES DYNAMIQUES
  const replaceVariables = (text) => {
    if (!text) return '';
    return text
      .replace(/\{name\}/gi, label.name || '')
      .replace(/\{price\}/gi, label.price != null ? formatCurrency(label.price) : '')
      .replace(/\{brand\}/gi, label.brand || '')
      .replace(/\{supplier\}/gi, label.supplier || '')
      .replace(/\{sku\}/gi, label.sku || '')
      .replace(/\{barcode\}/gi, label.barcode || '');
  };

  // 🎯 CONFIGURATION DES ÉLÉMENTS (structure unifiée)
  const elements = [
    // Nom
    {
      id: 'name',
      type: 'text',
      enabled: style.showName && label.name?.trim(),
      content: '{name}',
      fontSize: style.nameSize || 10,
      fontFamily: style.nameFontFamily || 'Arial',
      fontWeight: style.nameWeight || 'bold',
      color: style.colors?.name || '#000000',
      defaultY: paddingV,
    },

    // Prix
    {
      id: 'price',
      type: 'text',
      enabled: style.showPrice && label.price != null,
      content: '{price}',
      fontSize: style.priceSize || 14,
      fontFamily: style.priceFontFamily || 'Arial',
      fontWeight: style.priceWeight || 'bold',
      color: style.colors?.price || '#000000',
      defaultY: paddingV + 30,
    },

    // SKU
    {
      id: 'sku',
      type: 'text',
      enabled: style.showSku && label.sku?.trim(),
      content: '{sku}',
      fontSize: style.skuSize || 10,
      fontFamily: style.skuFontFamily || 'Arial',
      fontWeight: style.skuWeight || 'normal',
      color: style.colors?.sku || '#000000',
      defaultY: paddingV + 60,
    },

    // Brand
    {
      id: 'brand',
      type: 'text',
      enabled: style.showBrand && label.brand?.trim(),
      content: '{brand}',
      fontSize: style.brandSize || 10,
      fontFamily: style.brandFontFamily || 'Arial',
      fontWeight: style.brandWeight || 'normal',
      color: style.colors?.brand || '#000000',
      defaultY: paddingV + 80,
    },

    // Supplier
    {
      id: 'supplier',
      type: 'text',
      enabled: style.showSupplier && label.supplier?.trim(),
      content: '{supplier}',
      fontSize: style.supplierSize || 10,
      fontFamily: style.supplierFontFamily || 'Arial',
      fontWeight: style.supplierWeight || 'normal',
      color: style.colors?.supplier || '#000000',
      defaultY: paddingV + 100,
    },

    // Barcode principal
    {
      id: 'barcode',
      type: style.barcodeType === 'qrcode' ? 'qrcode' : 'barcode',
      enabled: style.showBarcode && label.barcode?.trim(),
      value: label.barcode,
      color: style.colors?.barcode || '#000000',
      showText: style.showBarcodeText !== false,
      textSize: style.barcodeTextSize || 8,
      textColor: style.colors?.barcodeText || '#000000',
      // 🎯 CALCUL DIRECT : Le pourcentage s'applique maintenant de manière linéaire
      // 40% = petit, 60% = moyen, 100% = large
      targetWidth: contentWidth * ((style.barcodeWidth || 60) / 150),
      height:
        style.barcodeType === 'qrcode'
          ? (style.qrCodeSize || 20) * mmToPx
          : (style.barcodeHeight || 15) * mmToPx * 0.4,
      // Position par défaut (en bas)
      defaultX: centerX,
      defaultY: canvasHeight - paddingV - 60,
    },

    // QR WooCommerce
    {
      id: 'wooQR',
      type: 'qrcode',
      enabled: style.showWooQR && label.websiteUrl?.trim(),
      value: label.websiteUrl,
      color: style.colors?.wooQR || '#000000',
      showText: style.showWooQRText !== false,
      text: style.wooQRText || 'Voir en ligne',
      textSize: style.wooQRTextSize || 7,
      textColor: style.colors?.wooQRText || '#000000',
      size: (style.wooQRSize || 10) * mmToPx,
      defaultX: canvasWidth - paddingH - (style.wooQRSize || 10) * mmToPx,
      defaultY: canvasHeight - paddingV - (style.wooQRSize || 10) * mmToPx - 15,
    },

    // Custom Texts (dynamiques avec variables)
    ...(style.customTexts
      ?.filter((t) => t.enabled && t.content?.trim())
      .map((text) => ({
        id: text.id,
        type: 'text',
        enabled: true,
        content: text.content, // Peut contenir {brand}, {supplier}, etc.
        fontSize: text.fontSize || 10,
        fontFamily: text.fontFamily || 'Arial',
        fontWeight: text.fontWeight || 'normal',
        color: text.color || '#000000',
        defaultY: paddingV + 120,
      })) || []),
  ];

  // 🎯 CALCUL DES POSITIONS (avec customPositions)
  const getPosition = (element) => {
    const customPos = style.customPositions?.[element.id];

    if (customPos) {
      // Pour les éléments Group (barcode, qrcode), on utilise directement x/y
      if (element.type === 'barcode' || element.type === 'qrcode') {
        return {
          x: customPos.x * mmToPx || customPos.centerX * mmToPx || element.defaultX || centerX,
          y: customPos.y * mmToPx || element.defaultY || paddingV,
        };
      }

      // Pour les textes, on utilise centerX
      return {
        x: customPos.centerX * mmToPx || customPos.x * mmToPx || centerX,
        y: customPos.y * mmToPx || element.defaultY || paddingV,
      };
    }

    // Position par défaut
    return {
      x: element.defaultX || centerX,
      y: element.defaultY || paddingV,
    };
  };

  // Handler pour les déplacements
  const handleDragEnd = (elementId) => (e) => {
    const node = e.target;

    // Pour les Groups, on récupère la position du Group lui-même
    const x = node.x();
    const y = node.y();

    const posInMm = {
      x: x / mmToPx,
      y: y / mmToPx,
      centerX: x / mmToPx, // Pour la compatibilité
    };

    console.log(`📍 Position ${elementId}:`, posInMm, `(${x}px, ${y}px)`);

    if (onPositionChange) {
      onPositionChange({
        objectType: elementId,
        position: posInMm,
      });
    }
  };

  // Zoom handlers
  const handleZoomChange = (newZoom) => {
    setZoomLevel(Math.max(50, Math.min(200, newZoom)));
  };

  const handleZoomIn = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleZoomChange(zoomLevel + 10);
  };

  const handleZoomOut = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleZoomChange(zoomLevel - 10);
  };

  const handleZoomReset = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleZoomChange(100);
  };

  const zoomFactor = zoomLevel / 100;
  const physicalRollWidth = isRollMode ? layout.rouleau?.width || 58 : layout.width;

  // Force update when style changes
  useEffect(() => {
    forceUpdate((prev) => prev + 1);
  }, [
    style.showName,
    style.showPrice,
    style.showSku,
    style.showBrand,
    style.showSupplier,
    style.showBarcode,
    style.showWooQR,
    style.nameSize,
    style.priceSize,
    style.skuSize,
    style.brandSize,
    style.supplierSize,
    style.qrCodeSize,
    style.wooQRSize,
    style.barcodeHeight,
    JSON.stringify(style.colors),
    JSON.stringify(style.customTexts),
  ]);

  if (!label) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 p-8">
        Aucune étiquette à prévisualiser
      </div>
    );
  }

  return (
    <div className="inline-block">
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
        {/* Contrôles de zoom */}
        <div className="mb-3 flex items-center justify-center gap-1 bg-gray-200 dark:bg-gray-600 p-2 rounded">
          <button
            onClick={handleZoomOut}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={zoomLevel <= 50}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Réduire"
          >
            <ZoomOut className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="text-xs font-mono text-gray-700 dark:text-gray-300 min-w-[40px] text-center px-1">
            {zoomLevel}%
          </div>

          <button
            onClick={handleZoomIn}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={zoomLevel >= 200}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Agrandir"
          >
            <ZoomIn className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>

          <button
            onClick={handleZoomReset}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-500 ml-1 transition-colors"
            title="Taille réelle"
          >
            <RotateCcw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Canvas Konva */}
        <div
          className="relative rounded border border-gray-300 dark:border-gray-600"
          style={{
            width: `${canvasWidth * zoomFactor * 2}px`,
            height: `${canvasHeight * zoomFactor * 2}px`,
            overflow: 'hidden',
            backgroundColor: '#f3f4f6',
            backgroundImage: `
              linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
              linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative shadow-lg"
              style={{
                border: isRollMode ? '2px solid #9ca3af' : '2px solid #d1d5db',
                borderRadius: isRollMode ? '6px' : '2px',
                backgroundColor: '#ffffff',
              }}
            >
              <Stage
                ref={stageRef}
                width={canvasWidth * zoomFactor}
                height={canvasHeight * zoomFactor}
                scaleX={zoomFactor}
                scaleY={zoomFactor}
              >
                <Layer>
                  {/* Fond blanc */}
                  <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="#ffffff" />

                  {/* Bordure */}
                  {style.showBorder && (
                    <Rect
                      x={2}
                      y={2}
                      width={canvasWidth - 4}
                      height={canvasHeight - 4}
                      stroke={style.colors?.border || '#000000'}
                      strokeWidth={style.borderWidth || 1}
                    />
                  )}

                  {/* 🎯 RENDU UNIFIÉ DE TOUS LES ÉLÉMENTS */}
                  {elements.map((element) => {
                    if (!element.enabled) return null;

                    const position = getPosition(element);

                    // Texte (inclut name, price, sku, brand, supplier, custom texts)
                    if (element.type === 'text') {
                      const displayText = replaceVariables(element.content);

                      return (
                        <Text
                          key={element.id}
                          text={displayText}
                          x={position.x}
                          y={position.y}
                          fontSize={element.fontSize}
                          fontFamily={element.fontFamily}
                          fontStyle={element.fontWeight}
                          fill={element.color}
                          align="center"
                          offsetX={50} // Centre le texte
                          draggable
                          onDragEnd={handleDragEnd(element.id)}
                          onClick={() => onElementSelect?.(element.id)}
                        />
                      );
                    }

                    // QR Code
                    if (element.type === 'qrcode') {
                      return (
                        <Group
                          key={element.id}
                          x={position.x}
                          y={position.y}
                          draggable
                          onDragEnd={handleDragEnd(element.id)}
                        >
                          <QRElement
                            value={element.value}
                            x={0}
                            y={0}
                            size={element.size || element.width}
                            color={element.color}
                          />
                          {element.showText && element.text && (
                            <Text
                              text={element.text}
                              x={(element.size || element.width) / 2}
                              y={(element.size || element.width) + 2}
                              fontSize={element.textSize}
                              fontFamily="Arial"
                              fill={element.textColor}
                              align="center"
                              offsetX={30}
                            />
                          )}
                        </Group>
                      );
                    }

                    // Barcode
                    if (element.type === 'barcode') {
                      return (
                        <Group
                          key={element.id}
                          x={position.x}
                          y={position.y}
                          draggable
                          onDragEnd={handleDragEnd(element.id)}
                        >
                          <BarcodeElement
                            value={element.value}
                            x={-element.targetWidth / 2}
                            y={0}
                            targetWidth={element.targetWidth}
                            height={element.height}
                            color={element.color}
                            displayValue={false}
                          />
                          {element.showText && (
                            <Text
                              text={element.value}
                              x={0}
                              y={element.height + 2}
                              fontSize={element.textSize}
                              fontFamily="Arial"
                              fill={element.textColor}
                              align="center"
                              offsetX={50}
                            />
                          )}
                        </Group>
                      );
                    }

                    return null;
                  })}
                </Layer>
              </Stage>
            </div>
          </div>
        </div>

        {/* Infos */}
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 text-center">
          <span className="font-medium">{label.name || 'Aperçu étiquette'}</span>
          <span className="mx-2">•</span>
          <span>
            {isRollMode ? (
              <>
                Imprimable: {layout.width}×{layout.height}mm
                <span className="mx-1 opacity-50">|</span>
                Rouleau: {physicalRollWidth}mm
              </>
            ) : (
              `${layout.width}×${layout.height}mm`
            )}
          </span>
          {zoomLevel !== 100 && (
            <>
              <span className="mx-2">•</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Zoom: {zoomLevel}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KonvaLabelCanvas;

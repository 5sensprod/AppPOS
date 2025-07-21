// 📁 hooks/useLabelConfiguration.js
import { useState } from 'react';

export const useLabelConfiguration = (onLayoutChange) => {
  const [customLayout, setCustomLayout] = useState({
    width: 48.5,
    height: 25,
    offsetTop: 22,
    offsetLeft: 8,
    spacingV: 0,
    spacingH: 0,
  });

  const [labelStyle, setLabelStyle] = useState({
    fontSize: 12,
    fontFamily: 'Arial',
    showBorder: false,
    borderWidth: 1,
    borderColor: '#000000',
    padding: 2,
    alignment: 'center',
    showBarcode: true,
    barcodeHeight: 15,
    showPrice: true,
    priceSize: 14,
    showName: false,
    nameSize: 10,
    duplicateCount: 1,
  });

  const [enableCellSelection, setEnableCellSelection] = useState(false);
  const [disabledCells, setDisabledCells] = useState(new Set());

  const calculateGridDimensions = () => {
    const pageWidth = 210; // A4 en mm
    const pageHeight = 297; // A4 en mm
    const usableWidth = pageWidth - customLayout.offsetLeft * 2;
    const usableHeight = pageHeight - customLayout.offsetTop * 2;
    const columns = Math.floor(usableWidth / (customLayout.width + customLayout.spacingH));
    const rows = Math.floor(usableHeight / (customLayout.height + customLayout.spacingV));
    return { columns, rows, total: columns * rows };
  };

  const handleCustomLayoutChange = (field, value) => {
    const newLayout = { ...customLayout, [field]: parseFloat(value) || 0 };
    setCustomLayout(newLayout);

    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: newLayout,
        style: labelStyle,
        disabledCells: Array.from(disabledCells),
      });
    }
  };

  const handleStyleChange = (newStyle) => {
    setLabelStyle((prev) => ({ ...prev, ...newStyle }));
    if (onLayoutChange) {
      onLayoutChange({
        preset: 'custom',
        layout: customLayout,
        style: { ...labelStyle, ...newStyle },
        disabledCells: Array.from(disabledCells),
      });
    }
  };

  return {
    customLayout,
    labelStyle,
    enableCellSelection,
    disabledCells,
    setEnableCellSelection,
    setDisabledCells,
    calculateGridDimensions,
    handleCustomLayoutChange,
    handleStyleChange,
  };
};

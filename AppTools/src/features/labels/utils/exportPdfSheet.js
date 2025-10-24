// src/utils/exportPdfSheet.js
import jsPDF from 'jspdf';
import Konva from 'konva';
import useLabelStore from '../store/useLabelStore';

/**
 * Utilitaires purs (réutilisables/testables)
 */
const computeCellDimensions = ({ sheetWidth, sheetHeight, rows, cols, margin, spacing }) => {
  const cellWidth = Math.floor((sheetWidth - 2 * margin - (cols - 1) * spacing) / cols);
  const cellHeight = Math.floor((sheetHeight - 2 * margin - (rows - 1) * spacing) / rows);
  return { cellWidth: Math.max(0, cellWidth), cellHeight: Math.max(0, cellHeight) };
};

const computeScale = ({ cellWidth, cellHeight, docWidth, docHeight }) => {
  const scaleX = cellWidth / docWidth;
  const scaleY = cellHeight / docHeight;
  return Math.min(scaleX, scaleY, 1);
};

const computeOffsets = ({ cellWidth, cellHeight, finalDocWidth, finalDocHeight }) => ({
  offsetX: (cellWidth - finalDocWidth) / 2,
  offsetY: (cellHeight - finalDocHeight) / 2,
});

/**
 * Remplace le texte des éléments liés à un produit (non destructif)
 */
function updateElementsWithProduct(elements, product) {
  if (!product) return elements;
  return elements.map((el) => {
    if (!el?.dataBinding) return el;
    let newText = el.text;
    switch (el.dataBinding) {
      case 'name':
        newText = product.name ?? '';
        break;
      case 'price':
        newText = product.price != null ? `${product.price}€` : '';
        break;
      case 'brand':
        newText = product.brand_ref?.name ?? '';
        break;
      case 'sku':
        newText = product.sku ?? '';
        break;
      case 'stock':
        newText = product.stock != null ? `Stock: ${product.stock}` : '';
        break;
      default:
        break;
    }
    return { ...el, text: newText };
  });
}

/**
 * Crée un dataURL PNG d'un document Konva pour un set d'éléments
 * (Stage/Layer sont créés, utilisés et détruits dans cet helper)
 */
async function createDocumentImage(elements, docWidth, docHeight, scale, pixelRatio) {
  const container = document.createElement('div');
  const stage = new Konva.Stage({ container, width: docWidth * scale, height: docHeight * scale });
  const layer = new Konva.Layer();
  stage.add(layer);

  // Fond blanc
  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width: docWidth * scale,
      height: docHeight * scale,
      fill: '#ffffff',
    })
  );

  // Éléments
  for (const el of elements) {
    if (el?.visible === false) continue;
    if (el?.type === 'text') {
      layer.add(
        new Konva.Text({
          x: (el.x ?? 0) * scale,
          y: (el.y ?? 0) * scale,
          text: el.text ?? '',
          fontSize: (el.fontSize ?? 12) * scale,
          fontStyle: el.bold ? 'bold' : 'normal',
          fill: el.color ?? '#000000',
          scaleX: el.scaleX ?? 1,
          scaleY: el.scaleY ?? 1,
          rotation: el.rotation ?? 0,
        })
      );
    }
    // TODO: gérer images, shapes, codes-barres, etc.
  }

  layer.draw();
  const dataURL = stage.toDataURL({ pixelRatio });
  stage.destroy();
  container.remove();
  return dataURL;
}

/**
 * Export PDF en planche.
 * - Si `products` est fourni, chaque cellule affiche un produit différent (dans l'ordre).
 * - Possibilité de surcharger les éléments via `elementsOverride`; sinon on lit le store.
 */
export async function exportPdfSheet(
  // docNode n'est pas utilisé aujourd'hui mais conservé pour compat API
  _docNode,
  {
    sheetWidth,
    sheetHeight,
    docWidth,
    docHeight,
    rows = 2,
    cols = 2,
    margin = 10,
    spacing = 5,
    fileName = 'planche.pdf',
    pixelRatio = 2,
    products = null,
    elementsOverride = null, // << optionnel : passer un tableau d'éléments pour éviter la dépendance au store
  } = {}
) {
  if (!sheetWidth || !sheetHeight || !docWidth || !docHeight) return;

  const { cellWidth, cellHeight } = computeCellDimensions({
    sheetWidth,
    sheetHeight,
    rows,
    cols,
    margin,
    spacing,
  });
  const scale = computeScale({ cellWidth, cellHeight, docWidth, docHeight });
  const finalDocWidth = docWidth * scale;
  const finalDocHeight = docHeight * scale;
  const { offsetX, offsetY } = computeOffsets({
    cellWidth,
    cellHeight,
    finalDocWidth,
    finalDocHeight,
  });

  const orientation = sheetWidth >= sheetHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: [sheetWidth, sheetHeight] });

  // Fond page blanc
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, sheetWidth, sheetHeight, 'F');

  // Récupération des éléments (store ou override)
  const baseElements = Array.isArray(elementsOverride)
    ? elementsOverride
    : (useLabelStore.getState()?.elements ?? []);

  // Mise en cache d'une cellule blanche (évite de recréer un stage)
  let blankCellDataURL = null;
  const getBlankCell = async () => {
    if (blankCellDataURL) return blankCellDataURL;
    blankCellDataURL = await createDocumentImage([], docWidth, docHeight, scale, pixelRatio);
    return blankCellDataURL;
  };

  const totalCells = rows * cols;
  const hasProducts = Array.isArray(products) && products.length > 0;

  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = margin + col * (cellWidth + spacing) + offsetX;
    const y = margin + row * (cellHeight + spacing) + offsetY;

    let dataURL;
    if (hasProducts && i < products.length) {
      const product = products[i];
      const updated = updateElementsWithProduct(baseElements, product);
      dataURL = await createDocumentImage(updated, docWidth, docHeight, scale, pixelRatio);
    } else if (hasProducts && i >= products.length) {
      dataURL = await getBlankCell();
    } else {
      dataURL = await createDocumentImage(baseElements, docWidth, docHeight, scale, pixelRatio);
    }

    pdf.addImage(dataURL, 'PNG', x, y, finalDocWidth, finalDocHeight);

    // Cadre pointillé de la cellule (découpe visuelle légère)
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineDash([2, 2]);
    pdf.setLineWidth(0.5);
    pdf.rect(
      margin + col * (cellWidth + spacing),
      margin + row * (cellHeight + spacing),
      cellWidth,
      cellHeight
    );
  }

  pdf.save(fileName);
}

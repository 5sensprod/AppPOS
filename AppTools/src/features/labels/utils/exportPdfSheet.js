// src/utils/exportPdfSheet.js
import jsPDF from 'jspdf';
import Konva from 'konva';

/**
 * Export PDF en planche avec répétition du document
 * @param {Konva.Group} docNode - Node du document Konva
 * @param {Object} options - Configuration de la planche
 */
export async function exportPdfSheet(
  docNode,
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
  } = {}
) {
  if (!docNode || !sheetWidth || !sheetHeight || !docWidth || !docHeight) {
    console.error('Paramètres manquants pour exportPdfSheet');
    return;
  }

  // Calcul des dimensions de cellule
  const cellWidth = Math.floor((sheetWidth - 2 * margin - (cols - 1) * spacing) / cols);
  const cellHeight = Math.floor((sheetHeight - 2 * margin - (rows - 1) * spacing) / rows);

  // Calcul du scaling pour adapter le document à la cellule
  const scaleX = cellWidth / docWidth;
  const scaleY = cellHeight / docHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Max 1 pour éviter l'agrandissement

  // Dimensions finales du document dans la cellule
  const finalDocWidth = docWidth * scale;
  const finalDocHeight = docHeight * scale;

  // Centrage dans la cellule
  const offsetX = (cellWidth - finalDocWidth) / 2;
  const offsetY = (cellHeight - finalDocHeight) / 2;

  // Création d'un stage temporaire pour chaque cellule
  const container = document.createElement('div');
  const stage = new Konva.Stage({
    container,
    width: finalDocWidth,
    height: finalDocHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // Clone le document avec le scale approprié
  const clone = docNode.clone({
    x: 0,
    y: 0,
    scaleX: scale,
    scaleY: scale,
  });

  layer.add(clone);
  layer.draw();

  // Export en dataURL haute résolution
  const dataURL = stage.toDataURL({ pixelRatio });

  // Création du PDF
  const orientation = sheetWidth >= sheetHeight ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'pt',
    format: [sheetWidth, sheetHeight],
  });

  // Fond blanc
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, sheetWidth, sheetHeight, 'F');

  // Ajout de chaque cellule
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = margin + col * (cellWidth + spacing) + offsetX;
      const y = margin + row * (cellHeight + spacing) + offsetY;

      pdf.addImage(dataURL, 'PNG', x, y, finalDocWidth, finalDocHeight);

      // Ligne de découpe optionnelle (en pointillés)
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineDash([2, 2]);
      pdf.setLineWidth(0.5);

      // Bordure de cellule
      pdf.rect(
        margin + col * (cellWidth + spacing),
        margin + row * (cellHeight + spacing),
        cellWidth,
        cellHeight
      );
    }
  }

  pdf.save(fileName);

  // Nettoyage
  stage.destroy();
  container.remove();
}

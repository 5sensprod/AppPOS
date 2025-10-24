// src/utils/exportPdfSheet.js
import jsPDF from 'jspdf';
import Konva from 'konva';
import QRCodeLib from 'qrcode';
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
 * Mini helper pour charger un dataURL en Image HTML (pour Konva.Image)
 */
function loadImageFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}

/**
 * 🆕 Helper pour charger une image depuis une URL
 */
function loadImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error('❌ Erreur chargement image:', url, err);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Remplace le texte + valeur QR des éléments liés à un produit (non destructif)
 * - Text: met à jour `text`
 * - QRCode: met à jour `qrValue`
 */
function updateElementsWithProduct(elements, product, fillQrWhenNoBinding = true) {
  if (!product) return elements;

  const pick = (key) => {
    switch (key) {
      case 'name':
        return product.name ?? '';
      case 'price':
        return product.price != null ? `${product.price}€` : '';
      case 'brand':
        return product.brand_ref?.name ?? '';
      case 'sku':
        return product.sku ?? '';
      case 'stock':
        return product.stock != null ? `Stock: ${product.stock}` : '';
      case 'supplier':
        return product.supplier_ref?.name ?? '';
      case 'website_url':
        return product.website_url ?? '';
      case 'barcode': {
        const meta = product?.meta_data?.find?.((m) => m.key === 'barcode');
        return meta?.value ?? '';
      }
      default:
        return '';
    }
  };

  const fallbackQR = () => {
    const barcode = product?.meta_data?.find?.((m) => m.key === 'barcode')?.value;
    return product.website_url || barcode || product.sku || product._id || '';
  };

  return elements.map((el) => {
    // TEXT
    if (el?.type === 'text') {
      if (!el.dataBinding) return el;
      return { ...el, text: pick(el.dataBinding) };
    }

    // QRCODE
    if (el?.type === 'qrcode') {
      // 1) Si binding explicite, on respecte absolument
      if (el.dataBinding) {
        return { ...el, qrValue: pick(el.dataBinding) };
      }
      // 2) Sinon, on remplit automatiquement par produit (option)
      if (fillQrWhenNoBinding) {
        return { ...el, qrValue: fallbackQR() };
      }
      return el;
    }

    // IMAGE - Pas de modification pour les images communes
    // (les images produit seront gérées plus tard)
    return el;
  });
}

/**
 * Crée un dataURL PNG d'un document Konva pour un set d'éléments
 * (Stage/Layer sont créés, utilisés et détruits dans cet helper)
 * -> Supporte: text, qrcode, image
 *
 * ✨ AMÉLIORATION QUALITÉ QR :
 * - QR générés à 4x la taille finale (scale * 4)
 * - Marge augmentée pour éviter le clipping
 * - ErrorCorrectionLevel 'H' pour meilleure lecture
 *
 * ✅ SUPPORT IMAGES :
 * - Images communes chargées et rendues
 * - Préservation des proportions
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
      listening: false,
    })
  );

  // Construction des nodes (async pour QR et Images)
  const nodePromises = (elements || []).map(async (el) => {
    if (el?.visible === false) return null;

    // TEXT
    if (el?.type === 'text') {
      return new Konva.Text({
        x: (el.x ?? 0) * scale,
        y: (el.y ?? 0) * scale,
        text: el.text ?? '',
        fontSize: (el.fontSize ?? 12) * scale,
        fontStyle: el.bold ? 'bold' : 'normal',
        fill: el.color ?? '#000000',
        scaleX: el.scaleX ?? 1,
        scaleY: el.scaleY ?? 1,
        rotation: el.rotation ?? 0,
        listening: false,
      });
    }

    // QRCODE - HAUTE RÉSOLUTION
    if (el?.type === 'qrcode') {
      const size = (el.size ?? 160) * scale;
      const color = el.color ?? '#000000';
      const bgColor = el.bgColor ?? '#FFFFFF';
      const qrValue = el.qrValue ?? '';

      try {
        // ✨ AMÉLIORATION : Générer le QR à 4x la résolution
        // pour une qualité parfaite même à l'impression
        const qrResolution = Math.max(512, Math.floor(size * 4));

        const dataURL = await QRCodeLib.toDataURL(qrValue, {
          width: qrResolution, // 🔥 4x plus grand
          margin: 2, // 🔥 Marge augmentée pour éviter le clipping
          color: { dark: color, light: bgColor },
          errorCorrectionLevel: 'H', // 🔥 Niveau maximal de correction d'erreur
          type: 'image/png',
          rendererOpts: {
            quality: 1.0, // Qualité maximale
          },
        });

        const imageObj = await loadImageFromDataURL(dataURL);

        return new Konva.Image({
          x: (el.x ?? 0) * scale,
          y: (el.y ?? 0) * scale,
          image: imageObj,
          width: size,
          height: size,
          rotation: el.rotation ?? 0,
          scaleX: el.scaleX ?? 1,
          scaleY: el.scaleY ?? 1,
          listening: false,
        });
      } catch (err) {
        console.error('QR generation failed in exportPdfSheet:', err);
        return null;
      }
    }

    // 🖼️ IMAGE - NOUVEAU SUPPORT
    if (el?.type === 'image') {
      const width = (el.width ?? 160) * scale;
      const height = (el.height ?? 160) * scale;
      const src = el.src ?? '';

      if (!src) {
        console.warn('⚠️ Image sans src:', el);
        return null;
      }

      try {
        const imageObj = await loadImageFromURL(src);

        return new Konva.Image({
          x: (el.x ?? 0) * scale,
          y: (el.y ?? 0) * scale,
          image: imageObj,
          width: width,
          height: height,
          rotation: el.rotation ?? 0,
          scaleX: el.scaleX ?? 1,
          scaleY: el.scaleY ?? 1,
          opacity: el.opacity ?? 1,
          listening: false,
        });
      } catch (err) {
        console.error('❌ Image loading failed in exportPdfSheet:', src, err);
        return null;
      }
    }

    // TODO: shapes si nécessaire
    return null;
  });

  // Attendre la création de tous les nodes
  const nodes = await Promise.all(nodePromises);
  nodes.filter(Boolean).forEach((node) => layer.add(node));

  layer.draw();

  // ✨ AMÉLIORATION : pixelRatio augmenté pour une meilleure qualité globale
  const dataURL = stage.toDataURL({ pixelRatio: Math.max(pixelRatio, 3) });

  // Cleanup
  stage.destroy();
  container.remove();
  return dataURL;
}

/**
 * Export PDF en planche.
 * - Si `products` est fourni, chaque cellule affiche un produit différent (dans l'ordre).
 * - Possibilité de surcharger les éléments via `elementsOverride`; sinon on lit le store.
 *
 * ✨ AMÉLIORATION QUALITÉ :
 * - pixelRatio par défaut augmenté à 3
 * - QR codes générés en haute résolution
 *
 * ✅ SUPPORT IMAGES :
 * - Images communes présentes sur toutes les cellules
 * - (Images produit à implémenter plus tard)
 */
export async function exportPdfSheet(
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
    pixelRatio = 3, // 🔥 Augmenté de 2 à 3
    products = null,
    elementsOverride = null,
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

  console.log('📦 Éléments à exporter:', baseElements);

  // Mise en cache d'une cellule blanche
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
      // 👇 forcer le remplissage des QR sans dataBinding
      const updated = updateElementsWithProduct(baseElements, product, true);
      console.log(`📝 Cellule ${i} avec produit:`, product.name);
      dataURL = await createDocumentImage(updated, docWidth, docHeight, scale, pixelRatio);
    } else if (hasProducts && i >= products.length) {
      dataURL = await getBlankCell();
    } else {
      console.log(`📝 Cellule ${i} sans produit (éléments de base)`);
      dataURL = await createDocumentImage(baseElements, docWidth, docHeight, scale, pixelRatio);
    }

    pdf.addImage(dataURL, 'PNG', x, y, finalDocWidth, finalDocHeight);

    // Cadre pointillé de la cellule (repère)
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

  console.log('✅ PDF généré:', fileName);
  pdf.save(fileName);
}

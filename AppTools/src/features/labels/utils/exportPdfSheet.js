// AppTools/src/features/labels/utils/exportPdfSheet.js
import jsPDF from 'jspdf';
import Konva from 'konva';
import QRCodeLib from 'qrcode';
import JsBarcode from 'jsbarcode';
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
 * Helper pour charger une image depuis une URL
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
 * Remplace les valeurs des éléments liés à un produit (non destructif)
 * - Text: met à jour `text`
 * - QRCode: met à jour `qrValue` (avec fallback si non lié selon fillQrWhenNoBinding)
 * - Barcode: met à jour `barcodeValue`
 * - Image: si dataBinding === 'product_image', remplace `src` par l'image produit
 */
function updateElementsWithProduct(elements, product, fillQrWhenNoBinding = false) {
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

  return (elements || []).map((el) => {
    // TEXT
    if (el?.type === 'text') {
      if (!el.dataBinding) return el;
      return { ...el, text: pick(el.dataBinding) };
    }

    // QRCODE
    if (el?.type === 'qrcode') {
      // 1) Binding explicite
      if (el.dataBinding) {
        return { ...el, qrValue: pick(el.dataBinding) };
      }
      // 2) Remplissage automatique selon option
      if (fillQrWhenNoBinding) {
        return { ...el, qrValue: fallbackQR() };
      }
      return el;
    }

    // 📊 BARCODE
    if (el?.type === 'barcode') {
      if (el.dataBinding) {
        return { ...el, barcodeValue: pick(el.dataBinding) };
      }
      return el; // commun si non lié
    }

    // 🖼️ IMAGE - Gestion des images produit
    if (el?.type === 'image') {
      // Image principale liée au produit
      if (el.dataBinding === 'product_image') {
        // Conventions courantes
        const productImageUrl =
          product?.src ||
          product?.image?.src ||
          product?.image_url ||
          (Array.isArray(product?.images) && product.images[0]
            ? typeof product.images[0] === 'string'
              ? product.images[0]
              : product.images[0]?.src || product.images[0]?.url
            : null);

        if (productImageUrl && productImageUrl !== el.src) {
          return { ...el, src: productImageUrl };
        }
        return el;
      }

      // Galerie : product_gallery_0, product_gallery_1, ...
      if (el.dataBinding?.startsWith?.('product_gallery_')) {
        const index = Number.parseInt(el.dataBinding.split('_')[2], 10);
        const galleryImage = product?.gallery_images?.[index];
        const gallerySrc =
          (typeof galleryImage === 'string'
            ? galleryImage
            : galleryImage?.src || galleryImage?.url) || null;
        if (gallerySrc && gallerySrc !== el.src) {
          return { ...el, src: gallerySrc };
        }
        return el;
      }

      // Image commune (pas de binding)
      return el;
    }

    return el;
  });
}

/**
 * Crée un dataURL PNG d'un document Konva pour un set d'éléments
 * (Stage/Layer sont créés, utilisés et détruits dans cet helper)
 * -> Supporte: text, qrcode, barcode, image
 *
 * ✨ QR haute qualité :
 * - Générés à 4x la taille finale
 * - Marge augmentée
 * - ErrorCorrectionLevel 'H'
 *
 * ✨ BARCODE haute qualité :
 * - Génération sur canvas à échelle x3
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

  // Construction des nodes (async pour QR, Barcode et Images)
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
        const qrResolution = Math.max(512, Math.floor(size * 4));
        const dataURL = await QRCodeLib.toDataURL(qrValue, {
          width: qrResolution,
          margin: 2,
          color: { dark: color, light: bgColor },
          errorCorrectionLevel: 'H',
          type: 'image/png',
          rendererOpts: { quality: 1.0 },
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

    // 📊 BARCODE - HAUTE RÉSOLUTION
    if (el?.type === 'barcode') {
      const width = (el.width ?? 200) * scale;
      const height = (el.height ?? 80) * scale;
      const barcodeValue = el.barcodeValue ?? '';
      const format = el.format ?? 'CODE128';

      if (!barcodeValue) {
        console.warn('⚠️ Code-barres sans valeur:', el);
        return null;
      }

      try {
        const barcodeScale = 3;
        const canvasWidth = Math.floor(width * barcodeScale);
        const canvasHeight = Math.floor(height * barcodeScale);

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const textHeight = el.displayValue ? (el.fontSize ?? 14) * scale * barcodeScale : 0;
        const barsHeight =
          canvasHeight - textHeight - (el.textMargin ?? 2) * scale * barcodeScale * 2;

        JsBarcode(canvas, barcodeValue, {
          format,
          width: 2 * barcodeScale,
          height: Math.max(20, barsHeight),
          displayValue: el.displayValue ?? true,
          fontSize: (el.fontSize ?? 14) * scale * barcodeScale,
          textMargin: (el.textMargin ?? 2) * scale * barcodeScale,
          margin: (el.margin ?? 10) * scale * barcodeScale,
          background: el.background ?? '#FFFFFF',
          lineColor: el.lineColor ?? '#000000',
          valid: (valid) => {
            if (!valid) console.warn('⚠️ Code-barres invalide:', barcodeValue, 'format:', format);
          },
        });

        const dataURL = canvas.toDataURL('image/png', 1.0);
        const imageObj = await loadImageFromDataURL(dataURL);

        return new Konva.Image({
          x: (el.x ?? 0) * scale,
          y: (el.y ?? 0) * scale,
          image: imageObj,
          width,
          height,
          rotation: el.rotation ?? 0,
          scaleX: el.scaleX ?? 1,
          scaleY: el.scaleY ?? 1,
          listening: false,
        });
      } catch (err) {
        console.error('❌ Code-barres generation failed:', barcodeValue, err);
        return null;
      }
    }

    // 🖼️ IMAGE
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
          width,
          height,
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

  // PixelRatio augmenté pour une meilleure qualité globale
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
 * ✅ SUPPORT :
 * - Images communes et images liées au produit
 * - QR codes (communs ou variables selon option)
 * - Codes-barres (communs ou liés)
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
    pixelRatio = 3, // qualité élevée par défaut
    products = null,
    elementsOverride = null,
    // QR non lié : false => commun (valeur du design), true => fallback par produit
    qrPerProductWhenUnbound = false,
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
      const updated = updateElementsWithProduct(baseElements, product, qrPerProductWhenUnbound);
      dataURL = await createDocumentImage(updated, docWidth, docHeight, scale, pixelRatio);
    } else if (hasProducts && i >= products.length) {
      dataURL = await getBlankCell();
    } else {
      const updated = updateElementsWithProduct(baseElements, null, false);
      dataURL = await createDocumentImage(updated, docWidth, docHeight, scale, pixelRatio);
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

  pdf.save(fileName);
}

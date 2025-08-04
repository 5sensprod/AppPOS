// AppServe/utils/barcodeGenerator.js
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');

/**
 * Génère une image de code-barres au format buffer
 * @param {string} barcode - Code-barres (peut être EAN-13 ou autre format)
 * @param {Object} options - Options de génération
 * @returns {Buffer} - Buffer de l'image du code-barres
 */
function createBarcodeImage(barcode, options = {}) {
  const {
    width = 2,
    height = 60,
    fontSize = 12,
    margin = 10,
    format = 'auto', // JsBarcode détecte automatiquement le format
  } = options;

  try {
    console.log('🔄 Génération code-barres serveur pour:', barcode);

    const canvas = createCanvas(200, 100); // Taille du canvas

    JsBarcode(canvas, barcode, {
      format: format === 'auto' ? undefined : format,
      width: width,
      height: height,
      displayValue: true,
      fontSize: fontSize,
      margin: margin,
      background: '#ffffff',
      lineColor: '#000000',
    });

    // Retourner le buffer de l'image
    const buffer = canvas.toBuffer('image/png');
    console.log('✅ Code-barres serveur généré pour:', barcode);

    return buffer;
  } catch (error) {
    console.error('❌ Erreur génération code-barres serveur:', error);
    throw error;
  }
}

module.exports = { createBarcodeImage };

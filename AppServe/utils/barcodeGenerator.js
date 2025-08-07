// AppServe/utils/barcodeGenerator.js
let bwip;

try {
  bwip = require('bwip-js');
  console.log('✅ bwip-js chargé avec succès');
} catch (error) {
  console.error('❌ Impossible de charger bwip-js:', error.message);
  bwip = null;
}

/**
 * Génère une image de code-barres au format buffer avec bwip-js (ASYNC)
 * @param {string} barcode - Code-barres (peut être EAN-13 ou autre format)
 * @param {Object} options - Options de génération
 * @returns {Promise<Buffer>} - Promise qui résout avec le Buffer de l'image PNG
 */
async function createBarcodeImage(barcode, options = {}) {
  if (!bwip) {
    throw new Error('bwip-js non disponible - module non installé ou non compatible');
  }

  const { width = 2, height = 60, fontSize = 12, margin = 10, format = 'auto' } = options;

  try {
    console.log('🔄 Génération code-barres bwip-js pour:', barcode);

    // Détecter automatiquement le format si 'auto'
    let bcid = 'code128'; // Format par défaut

    if (format === 'auto') {
      if (/^\d{13}$/.test(barcode)) {
        bcid = 'ean13';
      } else if (/^\d{12}$/.test(barcode)) {
        bcid = 'upca';
      } else if (/^\d{8}$/.test(barcode)) {
        bcid = 'ean8';
      } else {
        bcid = 'code128';
      }
    } else {
      bcid = format;
    }

    console.log(`🔄 Utilisation du format: ${bcid} pour: ${barcode}`);

    // ✅ CORRECTION : Utiliser await pour attendre la Promise
    const buffer = await bwip.toBuffer({
      bcid: bcid, // Type de code-barres
      text: barcode, // Texte à encoder
      scale: width, // Facteur d'échelle de largeur
      height: height, // Hauteur en pixels
      includetext: true, // Inclure le texte sous le code-barres
      textxalign: 'center', // Centrer le texte
      textfont: 'Helvetica', // Police du texte
      textsize: fontSize, // Taille de la police
      backgroundcolor: 'ffffff', // Fond blanc
      paddingleft: margin, // Marge gauche
      paddingright: margin, // Marge droite
      paddingtop: 5, // Marge haut
      paddingbottom: 5, // Marge bas
    });

    console.log(
      `✅ Code-barres bwip-js généré (${bcid}) pour: ${barcode}, taille: ${buffer.length} bytes`
    );
    return buffer;
  } catch (error) {
    console.error('❌ Erreur génération code-barres bwip-js:', error);
    console.error('❌ Détails:', {
      barcode,
      bcid: format,
      errorMessage: error.message,
    });
    throw error;
  }
}

// Test au chargement du module (version async)
if (bwip) {
  console.log('🧪 Test async bwip-js au chargement...');
  bwip
    .toBuffer({
      bcid: 'code128',
      text: 'TEST',
      scale: 1,
      height: 30,
      includetext: true,
    })
    .then((testBuffer) => {
      console.log('✅ Test async bwip-js OK, buffer généré:', testBuffer.length, 'bytes');
    })
    .catch((testError) => {
      console.error('❌ Test async bwip-js échoué:', testError.message);
    });
} else {
  console.warn('⚠️ bwip-js non disponible - codes-barres désactivés');
}

module.exports = { createBarcodeImage };

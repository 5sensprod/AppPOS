import React, { useEffect, useRef } from 'react';
// Si vous avez des problèmes avec l'import direct de JsBarcode
// vous pouvez essayer cette approche alternative
// et vous assurer que jsbarcode est correctement installé avec:
// npm install jsbarcode

const BarcodeDisplay = ({
  value,
  type = 'EAN13',
  width = 2,
  height = 100,
  fontSize = 12,
  displayValue = true,
  background = '#ffffff',
  lineColor = '#000000',
  margin = 10,
  flat = false,
  hideImprint = false,
}) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    // Import dynamique de JsBarcode
    const loadJsBarcode = async () => {
      try {
        // Utilisez l'import dynamique au lieu de l'import en haut du fichier
        const JsBarcode = (await import('jsbarcode')).default;

        if (barcodeRef.current && value) {
          try {
            // Configurer et générer le code-barres
            JsBarcode(barcodeRef.current, value, {
              format: type,
              width,
              height,
              displayValue,
              fontSize,
              textMargin: 6,
              background,
              lineColor,
              margin,
              flat,
              valid: (valid) => {
                if (!valid) {
                  console.error(`Code-barres invalide: ${value} pour le format ${type}`);
                }
              },
            });
          } catch (error) {
            console.error('Erreur de génération du code-barres:', error);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de JsBarcode:', error);
      }
    };

    loadJsBarcode();
  }, [value, type, width, height, displayValue, fontSize, background, lineColor, margin, flat]);

  if (!value) {
    return <div className="text-gray-400 p-4 text-center">Aucun code-barres défini</div>;
  }

  // Fonction pour télécharger le code-barres en SVG (format vectoriel)
  const downloadBarcodeSVG = () => {
    if (barcodeRef.current) {
      try {
        // Créer un lien temporaire pour télécharger l'image SVG
        const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const link = document.createElement('a');
        link.download = `barcode-${value}.svg`;
        link.href = svgUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(svgUrl);
      } catch (error) {
        console.error('Erreur lors du téléchargement en SVG:', error);
      }
    }
  };

  // Fonction pour télécharger le code-barres en PNG
  const downloadBarcodePNG = () => {
    if (barcodeRef.current) {
      try {
        // Convertir SVG en PNG
        const svgData = new XMLSerializer().serializeToString(barcodeRef.current);
        const canvas = document.createElement('canvas');
        // Définir une taille suffisante pour le canvas
        canvas.width = barcodeRef.current.clientWidth || 300;
        canvas.height = barcodeRef.current.clientHeight || 100;

        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function () {
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');

          const link = document.createElement('a');
          link.download = `barcode-${value}.png`;
          link.href = pngUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } catch (error) {
        console.error('Erreur lors du téléchargement en PNG:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <svg ref={barcodeRef} className="max-w-full"></svg>

      <div className="flex space-x-2 mt-3">
        <button
          onClick={downloadBarcodeSVG}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="Télécharger en SVG"
        >
          SVG
        </button>
        <button
          onClick={downloadBarcodePNG}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="Télécharger en PNG"
        >
          PNG
        </button>
      </div>
      <div className="mt-1 text-xs text-gray-500">Format: {type}</div>
    </div>
  );
};

export default BarcodeDisplay;

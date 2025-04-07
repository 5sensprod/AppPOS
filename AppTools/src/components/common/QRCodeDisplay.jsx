import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeDisplay = ({
  value,
  size = 128,
  level = 'M',
  bgColor = '#ffffff',
  fgColor = '#000000',
  includeMargin = true,
  imageSettings = null,
  hideImprint = false,
}) => {
  // Les niveaux de correction d'erreurs: L (7%), M (15%), Q (25%), H (30%)
  const qrRef = useRef(null);

  if (!value) {
    return <div className="text-gray-400 p-4 text-center">Aucun QR code défini</div>;
  }

  // Télécharger le QR code en SVG
  const downloadQRCodeAsSVG = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      const svgData = new XMLSerializer().serializeToString(svg);

      // Créer un blob SVG
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Télécharger le SVG
      const downloadLink = document.createElement('a');
      downloadLink.download = `qrcode-${value.substring(0, 10)}.svg`;
      downloadLink.href = svgUrl;
      downloadLink.click();

      // Nettoyer
      URL.revokeObjectURL(svgUrl);
    }
  };

  // Télécharger le QR code en PNG (conversion SVG vers PNG)
  const downloadQRCodeAsPNG = () => {
    if (qrRef.current) {
      const svg = qrRef.current.querySelector('svg');
      const svgData = new XMLSerializer().serializeToString(svg);

      // Convertir SVG en canvas pour le téléchargement PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Définir les dimensions du canvas
      canvas.width = size;
      canvas.height = size;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');

        // Télécharger l'image
        const downloadLink = document.createElement('a');
        downloadLink.download = `qrcode-${value.substring(0, 10)}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="flex flex-col items-center" ref={qrRef}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        bgColor={bgColor}
        fgColor={fgColor}
        includeMargin={includeMargin}
        imageSettings={imageSettings}
      />

      <div className="flex space-x-2 mt-3">
        <button
          onClick={downloadQRCodeAsSVG}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="Télécharger en SVG"
        >
          SVG
        </button>
        <button
          onClick={downloadQRCodeAsPNG}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
          title="Télécharger en PNG"
        >
          PNG
        </button>
      </div>

      <div className="mt-1 text-xs text-gray-500">QR Code · Niveau de correction: {level}</div>
    </div>
  );
};

export default QRCodeDisplay;

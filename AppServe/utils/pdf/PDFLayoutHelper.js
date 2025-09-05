// AppServe/utils/pdf/PDFLayoutHelper.js

/**
 * Utilitaires pour la mise en page et le formatage dans PDFKit
 */
class PDFLayoutHelper {
  constructor() {
    this.pageMargins = {
      portrait: { top: 40, bottom: 40, left: 35, right: 35 },
      landscape: { top: 30, bottom: 30, left: 25, right: 25 },
    };
  }

  /**
   * 📏 Calcul des dimensions utilisables de la page
   */
  getUsablePageDimensions(doc) {
    const page = doc.page;
    return {
      width: page.width - page.margins.left - page.margins.right,
      height: page.height - page.margins.top - page.margins.bottom,
      left: page.margins.left,
      right: page.width - page.margins.right,
      top: page.margins.top,
      bottom: page.height - page.margins.bottom,
    };
  }

  /**
   * 🔢 Formatage des montants en euros - Version manuelle pour PDFKit
   */
  formatCurrency(amount) {
    const num = parseFloat(amount || 0);

    // Formatage manuel pour éviter les problèmes d'encodage
    const parts = num.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const decimalPart = parts[1];

    return `${integerPart},${decimalPart} €`;
  }

  /**
   * 🔢 Formatage des nombres avec séparateurs français - Version manuelle
   */
  formatNumber(num) {
    const number = parseInt(num || 0);

    // Formatage manuel avec espaces comme séparateurs de milliers
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /**
   * 📊 Formatage des pourcentages
   */
  formatPercentage(num) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format((num || 0) / 100);
  }

  /**
   * 📅 Formatage de la date en français
   */
  formatDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * ⏰ Formatage de l'heure
   */
  formatTime(date = new Date()) {
    return date.toLocaleTimeString('fr-FR');
  }

  /**
   * 📅 Formatage de date courte
   */
  formatShortDate(date = new Date()) {
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * 🏷️ Libellé des taux de TVA
   */
  getTaxRateLabel(rate) {
    const labels = {
      0: 'Exonéré (0%)',
      2.1: 'Taux super réduit (2,1%)',
      5.5: 'Taux réduit (5,5%)',
      10: 'Taux intermédiaire (10%)',
      20: 'Taux normal (20%)',
    };
    return labels[rate] || `Taux spécial (${rate}%)`;
  }

  /**
   * 📐 Calcul de la largeur des colonnes d'un tableau
   */
  calculateColumnWidths(totalWidth, columnPercentages) {
    const result = {};
    Object.entries(columnPercentages).forEach(([key, percentage]) => {
      result[key] = (totalWidth * percentage) / 100;
    });
    return result;
  }

  /**
   * 📏 Calcul de la position X pour l'alignement de texte
   */
  getAlignedX(x, width, text, font, fontSize, alignment = 'left') {
    switch (alignment) {
      case 'center':
        const textWidth = font.widthOfString(text, fontSize);
        return x + (width - textWidth) / 2;
      case 'right':
        const rightTextWidth = font.widthOfString(text, fontSize);
        return x + width - rightTextWidth;
      default:
        return x;
    }
  }

  /**
   * 📝 Découpage de texte pour respecter une largeur maximale
   */
  wrapText(text, font, fontSize, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfString(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Mot trop long, on le coupe
          lines.push(word);
        }
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * 🎯 Centrage d'éléments dans une zone
   */
  centerElement(containerX, containerWidth, elementWidth) {
    return containerX + (containerWidth - elementWidth) / 2;
  }

  /**
   * 📄 Gestion automatique des sauts de page
   */
  checkPageBreak(doc, currentY, requiredHeight, marginBottom = 50) {
    const dimensions = this.getUsablePageDimensions(doc);

    if (currentY + requiredHeight > dimensions.bottom - marginBottom) {
      doc.addPage();
      return doc.page.margins.top;
    }

    return currentY;
  }

  /**
   * 🔲 Dessin d'un rectangle avec bordure - Version corrigée
   */
  drawBorderedBox(doc, x, y, width, height, options = {}) {
    const { fillColor = null, borderColor = '#000000', borderWidth = 1 } = options;

    // Remplissage si couleur spécifiée
    if (fillColor) {
      doc.rect(x, y, width, height).fill(fillColor);
    }

    // Bordure - méthode simplifiée
    doc.lineWidth(borderWidth).strokeColor(borderColor).rect(x, y, width, height).stroke();
  }

  /**
   * 📊 Création d'une grille pour les métriques
   */
  createMetricsGrid(totalWidth, cols = 2, gap = 15) {
    const availableWidth = totalWidth - gap * (cols - 1);
    const boxWidth = availableWidth / cols;

    const positions = [];
    for (let i = 0; i < cols; i++) {
      positions.push({
        x: i * (boxWidth + gap),
        width: boxWidth,
      });
    }

    return positions;
  }

  /**
   * 🧮 Arrondi à 2 décimales
   */
  roundTo2Decimals(num) {
    return Math.round((num || 0) * 100) / 100;
  }

  /**
   * ✨ Escape du texte pour éviter les problèmes d'affichage
   */
  escapeText(text) {
    if (!text) return '';
    return text.toString().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  }

  /**
   * 📋 Calcul de la hauteur nécessaire pour un texte multiligne
   */
  getTextHeight(text, font, fontSize, maxWidth, lineHeight = 1.2) {
    const lines = this.wrapText(text, font, fontSize, maxWidth);
    return lines.length * fontSize * lineHeight;
  }

  /**
   * 🎨 Application des styles de texte
   */
  applyTextStyle(doc, style) {
    doc.font(style.font).fontSize(style.fontSize).fillColor(style.color);
  }

  /**
   * 📐 Création de colonnes avec largeurs proportionnelles
   */
  createProportionalColumns(totalWidth, proportions, gap = 0) {
    const totalProportions = proportions.reduce((sum, prop) => sum + prop, 0);
    const availableWidth = totalWidth - gap * (proportions.length - 1);

    let currentX = 0;
    return proportions.map((proportion) => {
      const width = (availableWidth * proportion) / totalProportions;
      const result = { x: currentX, width };
      currentX += width + gap;
      return result;
    });
  }
}

module.exports = PDFLayoutHelper;

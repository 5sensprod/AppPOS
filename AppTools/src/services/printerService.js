// src/services/printerService.js
import apiService from './api';

class PrinterService {
  constructor() {
    this.baseEndpoint = '/api/printer';
  }

  // Gestion des imprimantes
  async listPrinters() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/ports`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des imprimantes:', error);
      throw error;
    }
  }

  // Gestion de la connexion
  async connect(printerName, config = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/connect`, {
        printerName,
        config,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/disconnect`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/status`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du statut:', error);
      throw error;
    }
  }

  // Impression de base
  async printText(text, options = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/print/text`, {
        text,
        options,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'impression du texte:", error);
      throw error;
    }
  }

  async printLine(leftText = '', rightText = '', separator = '.') {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/print/line`, {
        left_text: leftText,
        right_text: rightText,
        separator,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'impression de la ligne:", error);
      throw error;
    }
  }

  // Impression avancée
  async printReceipt(items, options = {}) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/print/receipt`, {
        items,
        options,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'impression du ticket:", error);
      throw error;
    }
  }

  // Contrôles papier
  async cutPaper(fullCut = false) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/cut`, {
        full_cut: fullCut,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la coupe du papier:', error);
      throw error;
    }
  }

  async feedPaper(lines = 3) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/feed`, {
        lines,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'avance du papier:", error);
      throw error;
    }
  }

  // Test
  async testPrinter() {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/test`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors du test de l'imprimante:", error);
      throw error;
    }
  }

  // === NOUVELLE MÉTHODE : CALIBRATION ===

  async calibratePrinter(paperWidth = 80, fontSize = 10) {
    try {
      const response = await apiService.post(`${this.baseEndpoint}/calibrate`, {
        paperWidth,
        fontSize,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la calibration:', error);
      throw error;
    }
  }

  // Test des capacités
  async testCapabilities() {
    try {
      const response = await apiService.get(`${this.baseEndpoint}/capabilities`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du test des capacités:', error);
      throw error;
    }
  }

  // Méthodes utilitaires
  formatText(text) {
    if (!text) return '';

    return String(text)
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[€]/g, 'EUR')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  validateText(text) {
    const errors = [];

    if (!text || text.trim().length === 0) {
      errors.push('Le texte ne peut pas être vide');
    }

    if (text && text.length > 1000) {
      errors.push('Le texte ne peut pas dépasser 1000 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateReceipt(items) {
    const errors = [];

    if (!items || !Array.isArray(items)) {
      errors.push('La liste des articles doit être un tableau');
    } else {
      if (items.length === 0) {
        errors.push('La liste des articles ne peut pas être vide');
      }

      items.forEach((item, index) => {
        if (!item.name) {
          errors.push(`Article ${index + 1}: nom requis`);
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          errors.push(`Article ${index + 1}: prix invalide`);
        }
        if (item.quantity && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
          errors.push(`Article ${index + 1}: quantité invalide`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Méthodes pour la gestion d'état local
  createConnectionState() {
    return {
      connected: false,
      loading: false,
      error: null,
      printer: null,
      method: null,
      config: null,
      lastUpdate: null,
      connectionTime: null,
      printCount: 0,
      lastPrint: null,
    };
  }

  // Configuration par défaut
  getDefaultConfig() {
    return {
      paperWidth: 80,
      fontSize: 10,
      fontBold: true,
      fontFamily: 'Courier New',
      charactersPerLine: 30, // VALEUR PAR DÉFAUT : 30 caractères
      printMethod: 'powershell_dotnet',
      marginLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
    };
  }

  // Validation de la configuration
  validateConfig(config) {
    const validPaperWidths = [30, 58, 80, 110];
    const validFontSizes = [8, 9, 10, 11, 12, 14, 16];
    const validFontFamilies = ['Courier New', 'Arial', 'Times New Roman', 'Consolas'];
    const validPrintMethods = ['powershell_dotnet', 'windows_spooler'];

    const errors = [];

    if (config.paperWidth && !validPaperWidths.includes(config.paperWidth)) {
      errors.push('Largeur de papier invalide (30, 58, 80, 110mm supportées)');
    }

    if (config.fontSize && !validFontSizes.includes(config.fontSize)) {
      errors.push('Taille de police invalide (8-16pt supportées)');
    }

    if (config.fontFamily && !validFontFamilies.includes(config.fontFamily)) {
      errors.push('Police invalide');
    }

    if (config.printMethod && !validPrintMethods.includes(config.printMethod)) {
      errors.push("Méthode d'impression invalide");
    }

    if (
      config.charactersPerLine &&
      (config.charactersPerLine < 10 || config.charactersPerLine > 100)
    ) {
      errors.push('Nombre de caractères par ligne invalide (10-100)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Méthodes utilitaires pour les calculs
  calculateCharsPerLine(paperWidth, fontSize) {
    let baseChars;
    if (paperWidth <= 30) {
      baseChars = 20;
    } else if (paperWidth <= 58) {
      baseChars = 32;
    } else if (paperWidth <= 80) {
      baseChars = 48;
    } else {
      baseChars = 64;
    }

    // Ajustement selon la taille de police
    const fontSizeMultiplier = fontSize <= 8 ? 1.1 : fontSize >= 12 ? 0.9 : 1;
    return Math.floor(baseChars * fontSizeMultiplier);
  }

  wrapText(text, charsPerLine = 48) {
    if (!text) return [];

    const lines = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= charsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Mot trop long, on le coupe
          let longWord = word;
          while (longWord.length > charsPerLine) {
            lines.push(longWord.substring(0, charsPerLine));
            longWord = longWord.substring(charsPerLine);
          }
          if (longWord.length > 0) {
            currentLine = longWord;
          }
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Prévisualisation du formatage
  previewFormat(text, options = {}) {
    const { paperWidth = 80, fontSize = 10, charsPerLine = null, autoWrap = true } = options;

    const finalCharsPerLine = charsPerLine || this.calculateCharsPerLine(paperWidth, fontSize);

    if (autoWrap) {
      return this.wrapText(text, finalCharsPerLine);
    } else {
      return [text.substring(0, finalCharsPerLine)];
    }
  }
}

// Exporter une instance unique
export default new PrinterService();

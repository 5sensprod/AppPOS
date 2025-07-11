// src/services/exportService.js - Version étendue avec support des étiquettes
import apiService from './api';

/**
 * Service pour gérer les exports de données
 */
class ExportService {
  /**
   * Exporte les produits selon la configuration fournie
   *
   * @param {Object} exportConfig - Configuration de l'export
   * @returns {Promise} - Promise qui résout à un Blob du fichier exporté
   */
  async exportProducts(exportConfig) {
    try {
      const { format = 'pdf', exportType = 'table' } = exportConfig;

      // ✅ NOUVEAU : Gestion des étiquettes
      if (exportType === 'labels') {
        console.log("🏷️ Export d'étiquettes demandé");
        return this.exportLabels(exportConfig);
      }

      // Export classique (tableau)
      if (format === 'pdf') {
        return this.exportProductsToPDF(exportConfig);
      } else if (format === 'csv') {
        return this.exportProductsToCSV(exportConfig);
      } else {
        throw new Error(`Format d'export non supporté: ${format}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'export:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Exporte les étiquettes des produits
   *
   * @param {Object} exportConfig - Configuration de l'export
   * @param {Array} exportConfig.selectedItems - IDs des produits sélectionnés
   * @param {Array} exportConfig.labelData - Données des étiquettes extraites
   * @param {Object} exportConfig.labelLayout - Configuration de mise en page
   * @param {String} exportConfig.orientation - 'portrait' ou 'landscape'
   * @param {String} exportConfig.title - Titre du document
   * @returns {Promise} - Promise qui résout à un Blob PDF
   */
  async exportLabels(exportConfig) {
    try {
      console.log('🏷️ Début export étiquettes avec config:', exportConfig);

      // ✅ VÉRIFICATION DES DONNÉES
      if (!exportConfig.labelData || exportConfig.labelData.length === 0) {
        throw new Error("Aucune donnée d'étiquette à exporter");
      }

      // ✅ OPTION 1 : Export côté serveur (recommandé pour la production)
      if (this.shouldUseServerSideExport()) {
        return this.exportLabelsServerSide(exportConfig);
      }

      // ✅ OPTION 2 : Export côté client (pour test et développement)
      return this.exportLabelsClientSide(exportConfig);
    } catch (error) {
      console.error("Erreur lors de l'export d'étiquettes:", error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Export d'étiquettes côté serveur
   */
  async exportLabelsServerSide(exportConfig) {
    try {
      // Configuration pour l'API
      const serverConfig = {
        selectedItems: exportConfig.selectedItems,
        labelLayout: exportConfig.labelLayout || this.getDefaultLabelLayout(),
        orientation: exportConfig.orientation || 'portrait',
        title: exportConfig.title || 'Étiquettes produits',
        exportType: 'labels',
      };

      console.log('🚀 Envoi vers serveur:', serverConfig);

      // Appel API pour générer les étiquettes
      const response = await apiService.post('/api/products/export/labels', serverConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Etiquettes'}_${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename, 'application/pdf');

      return response.data;
    } catch (error) {
      console.error('Erreur export étiquettes serveur:', error);
      // Fallback vers export client
      console.log('📱 Fallback vers export client...');
      return this.exportLabelsClientSide(exportConfig);
    }
  }

  /**
   * ✅ NOUVEAU : Export d'étiquettes côté client (avec jsPDF)
   */
  async exportLabelsClientSide(exportConfig) {
    try {
      console.log('📱 Export côté client avec jsPDF');

      // Import dynamique des dépendances
      const { jsPDF } = await import('jspdf');
      const JsBarcode = (await import('jsbarcode')).default;

      // Configuration
      const layout = exportConfig.labelLayout?.layout || this.getDefaultLabelLayout();
      const style = exportConfig.labelLayout?.style || this.getDefaultLabelStyle();
      const labelData = exportConfig.labelData;

      console.log('🎨 Layout:', layout);
      console.log('🎨 Style:', style);
      console.log('📋 Données:', labelData.length, 'étiquettes');

      // ✅ CALCUL DES DIMENSIONS ET POSITIONS
      // Calculer combien d'étiquettes par page en fonction de la taille A4
      const pageWidth = 210; // A4 en mm
      const pageHeight = 297; // A4 en mm

      // Calculer combien d'étiquettes peuvent tenir
      const maxColumns = Math.floor(
        (pageWidth - (layout.offsetLeft || 0) * 2) / (layout.width + (layout.spacingH || 0))
      );
      const maxRows = Math.floor(
        (pageHeight - (layout.offsetTop || 0) * 2) / (layout.height + (layout.spacingV || 0))
      );

      const columns = Math.max(1, maxColumns);
      const rows = Math.max(1, maxRows);
      const labelsPerPage = columns * rows;

      console.log(`📐 Calculé: ${columns}×${rows} = ${labelsPerPage} étiquettes par page`);

      // Créer le PDF
      const doc = new jsPDF({
        orientation: exportConfig.orientation === 'landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let currentPage = 0;

      // Générer les étiquettes
      for (let i = 0; i < labelData.length; i++) {
        const label = labelData[i];

        // Calculer position sur la page
        const positionOnPage = i % labelsPerPage;
        const col = positionOnPage % columns;
        const row = Math.floor(positionOnPage / columns);

        // Nouvelle page si nécessaire
        if (i > 0 && positionOnPage === 0) {
          doc.addPage();
          currentPage++;
        }

        // ✅ CALCUL POSITION AVEC OFFSETS (nouveau format)
        const x =
          (layout.offsetLeft || layout.marginLeft || 0) +
          col * (layout.width + (layout.spacingH || 0));
        const y =
          (layout.offsetTop || layout.marginTop || 0) +
          row * (layout.height + (layout.spacingV || 0));

        console.log(`🏷️ Étiquette ${i + 1}: ${label.name} à (${x}, ${y})`);

        // Dessiner l'étiquette
        await this.drawLabelOnPDF(
          doc,
          label,
          { x, y, width: layout.width, height: layout.height },
          style,
          JsBarcode
        );
      }

      // Sauvegarder le PDF
      const filename = `${exportConfig.title || 'Etiquettes'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

      console.log('✅ Export client terminé:', filename);
      return { success: true, filename };
    } catch (error) {
      console.error('Erreur export client:', error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Dessine une étiquette sur le PDF
   */
  async drawLabelOnPDF(doc, labelData, position, style, JsBarcode) {
    const { x, y, width, height } = position;

    try {
      // ✅ BORDURE
      if (style.showBorder) {
        doc.setDrawColor('#000000');
        doc.setLineWidth(0.1);
        doc.rect(x, y, width, height);
      }

      // ✅ ZONES DE CONTENU
      const padding = style.padding || 2;
      const contentX = x + padding;
      const contentY = y + padding;
      const contentWidth = width - padding * 2;
      const contentHeight = height - padding * 2;

      let currentY = contentY;

      // ✅ NOM DU PRODUIT (en haut)
      if (style.showName && labelData.name) {
        doc.setFontSize(style.nameSize || 10);
        doc.setFont('helvetica', 'bold');

        // Centrer le texte
        const textWidth = doc.getTextWidth(labelData.name);
        const textX = contentX + (contentWidth - textWidth) / 2;

        doc.text(labelData.name, textX, currentY + 4);
        currentY += 8;
      }

      // ✅ PRIX (style proéminent)
      if (style.showPrice && labelData.price) {
        const priceText = `${labelData.price.toFixed(2)} €`;
        doc.setFontSize(style.priceSize || 14);
        doc.setFont('helvetica', 'bold');

        const priceWidth = doc.getTextWidth(priceText);
        const priceX = contentX + (contentWidth - priceWidth) / 2;

        doc.text(priceText, priceX, currentY + 5);
        currentY += 10;
      }

      // ✅ CODE-BARRES AMÉLIORÉ (si disponible)
      if (style.showBarcode && labelData.barcode && labelData.barcode.trim() !== '') {
        try {
          // Créer un canvas temporaire pour le code-barres
          const canvas = document.createElement('canvas');
          canvas.width = 300; // ✅ Plus large pour meilleure qualité
          canvas.height = 80; // ✅ Plus haut pour les chiffres

          // ✅ GÉNÉRATION CODE-BARRES AMÉLIORÉE
          JsBarcode(canvas, labelData.barcode, {
            format: 'EAN13',
            width: 2, // ✅ Largeur des barres
            height: 40, // ✅ Hauteur des barres
            displayValue: true, // ✅ AFFICHER les chiffres
            fontSize: 12, // ✅ Taille des chiffres PLUS GRANDE
            textMargin: 4, // ✅ Marge entre barres et texte
            fontOptions: 'bold', // ✅ Chiffres en gras
            background: '#ffffff',
            lineColor: '#000000',
            margin: 5,
          });

          // Convertir en image et ajouter au PDF
          const imgData = canvas.toDataURL('image/png');
          const barcodeWidth = Math.min(contentWidth - 2, 40);
          const barcodeHeight = 18; // ✅ Plus haut pour inclure les chiffres
          const barcodeX = contentX + (contentWidth - barcodeWidth) / 2;

          doc.addImage(imgData, 'PNG', barcodeX, currentY, barcodeWidth, barcodeHeight);
          currentY += barcodeHeight + 2;
        } catch (barcodeError) {
          console.warn('Erreur génération code-barres pour', labelData.barcode, barcodeError);

          // Fallback : afficher le code en texte
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const codeWidth = doc.getTextWidth(labelData.barcode);
          const codeX = contentX + (contentWidth - codeWidth) / 2;
          doc.text(labelData.barcode, codeX, currentY + 3);
        }
      }
    } catch (error) {
      console.error('Erreur dessin étiquette:', error);

      // Fallback : étiquette simple avec texte uniquement
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(labelData.name || 'Produit', x + 2, y + 8);
      if (labelData.price) {
        doc.text(`${labelData.price.toFixed(2)} €`, x + 2, y + 16);
      }
    }
  }

  /**
   * ✅ NOUVEAU : Configuration par défaut pour les étiquettes
   */
  getDefaultLabelLayout() {
    return {
      width: 48.5,
      height: 25,
      offsetTop: 22,
      offsetLeft: 8,
      spacingH: 0,
      spacingV: 0,
    };
  }

  getDefaultLabelStyle() {
    return {
      fontSize: 12,
      fontFamily: 'Arial',
      showBorder: true,
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 2,
      alignment: 'center',
      showBarcode: true,
      barcodeHeight: 15,
      showPrice: true,
      priceSize: 14,
      showName: true,
      nameSize: 10,
    };
  }

  /**
   * ✅ NOUVEAU : Détermine si on utilise l'export serveur
   */
  shouldUseServerSideExport() {
    // Pour l'instant, utiliser côté client pour le développement
    // En production, vous pourrez activer le serveur
    return false; // Changez en true quand l'API serveur sera prête
  }

  /**
   * Exporte les produits au format PDF (méthode existante)
   */
  async exportProductsToPDF(exportConfig) {
    try {
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        orientation: exportConfig.orientation,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
      };

      console.log("Demande d'export PDF avec configuration optimisée:", streamlinedConfig);

      const response = await apiService.post('/api/products/export/pdf', streamlinedConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.pdf`;
      this.downloadBlob(response.data, filename, 'application/pdf');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      throw error;
    }
  }

  /**
   * Exporte des produits au format CSV (méthode existante)
   */
  async exportProductsToCSV(exportConfig) {
    try {
      const streamlinedConfig = {
        selectedItems: exportConfig.selectedItems,
        selectedColumns: exportConfig.selectedColumns,
        title: exportConfig.title,
        customColumn: exportConfig.customColumn,
      };

      console.log("Demande d'export CSV avec configuration optimisée:", streamlinedConfig);

      const response = await apiService.post('/api/products/export/csv', streamlinedConfig, {
        responseType: 'blob',
      });

      const filename = `${exportConfig.title || 'Export Produits'}_${new Date().toISOString().split('T')[0]}.csv`;
      this.downloadBlob(response.data, filename, 'text/csv');

      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      throw error;
    }
  }

  /**
   * Télécharge un blob comme fichier (méthode existante)
   */
  downloadBlob(blob, filename, mimeType) {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 100);
  }
}

export default new ExportService();

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

      // ✅ CALCUL FIXE DES DIMENSIONS ET POSITIONS
      const pageWidth = 210; // A4 en mm
      const pageHeight = 297; // A4 en mm

      // ✅ CALCUL SIMPLE DU NOMBRE D'ÉTIQUETTES QUI TIENNENT
      const offsetLeft = layout.offsetLeft || 8;
      const offsetTop = layout.offsetTop || 22;
      const spacingH = layout.spacingH || 0;
      const spacingV = layout.spacingV || 0;

      // Largeur et hauteur utilisables
      const usableWidth = pageWidth - offsetLeft * 2;
      const usableHeight = pageHeight - offsetTop * 2;

      // Nombre de colonnes/lignes possibles
      const columns = Math.floor(usableWidth / (layout.width + spacingH));
      const rows = Math.floor(usableHeight / (layout.height + spacingV));
      const labelsPerPage = columns * rows;

      console.log(
        `📐 Calculé: ${columns} colonnes × ${rows} lignes = ${labelsPerPage} étiquettes par page`
      );
      console.log(
        `📐 Dimensions: ${layout.width}×${layout.height}mm, Espacement: ${spacingH}×${spacingV}mm`
      );

      // Créer le PDF
      const doc = new jsPDF({
        orientation: exportConfig.orientation === 'landscape' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

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
          console.log(`📄 Nouvelle page ${Math.floor(i / labelsPerPage) + 1}`);
        }

        // ✅ CALCUL POSITION PRÉCIS
        const x = offsetLeft + col * (layout.width + spacingH);
        const y = offsetTop + row * (layout.height + spacingV);

        console.log(
          `🏷️ Étiquette ${i + 1}: ${label.name} à (${x.toFixed(1)}, ${y.toFixed(1)}) - Col ${col}, Row ${row}`
        );

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
      // ✅ BORDURE (si activée)
      if (style.showBorder) {
        doc.setDrawColor('#000000');
        doc.setLineWidth(0.1);
        doc.rect(x, y, width, height);
      }

      // ✅ ZONES DE CONTENU AVEC PADDING
      const padding = style.padding || 1;
      const contentX = x + padding;
      const contentY = y + padding;
      const contentWidth = width - padding * 2;
      const contentHeight = height - padding * 2;

      // ✅ CALCUL INTELLIGENT DE L'ESPACE DISPONIBLE
      let currentY = contentY;
      const elementSpacing = 1; // Espacement entre éléments

      // Calculer l'espace nécessaire pour chaque élément (en mm)
      const priceHeight = style.showPrice ? Math.max(3, (style.priceSize || 14) * 0.35) : 0;
      const nameHeight = style.showName ? Math.max(2.5, (style.nameSize || 10) * 0.35) : 0;
      const barcodeHeight = style.showBarcode ? Math.max(8, style.barcodeHeight || 15) : 0;
      const barcodeTextHeight = style.showBarcode ? 4 : 0; // Hauteur pour les chiffres sous code-barres

      // Espace total nécessaire
      const totalNeededHeight =
        priceHeight + nameHeight + barcodeHeight + barcodeTextHeight + elementSpacing * 4;

      // ✅ AJUSTEMENT AUTOMATIQUE SI ÇA NE RENTRE PAS
      let scale = 1;
      if (totalNeededHeight > contentHeight) {
        scale = Math.max(0.6, contentHeight / totalNeededHeight);
        console.log(`⚠️ Ajustement échelle: ${scale.toFixed(2)} pour étiquette ${labelData.name}`);
      }

      // ✅ NOM DU PRODUIT (en haut si activé)
      if (style.showName && labelData.name) {
        const fontSize = Math.max(6, (style.nameSize || 10) * scale);
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        // Tronquer le nom si trop long
        let displayName = labelData.name;
        let textWidth = doc.getTextWidth(displayName);

        while (textWidth > contentWidth && displayName.length > 10) {
          displayName = displayName.substring(0, displayName.length - 4) + '...';
          textWidth = doc.getTextWidth(displayName);
        }

        const textX = contentX + (contentWidth - textWidth) / 2;
        doc.text(displayName, textX, currentY + fontSize * 0.35);
        currentY += nameHeight * scale + elementSpacing;

        console.log(
          `📝 Nom affiché: "${displayName}" à (${textX.toFixed(1)}, ${(currentY - nameHeight * scale - elementSpacing + fontSize * 0.35).toFixed(1)})`
        );
      }

      // ✅ PRIX (style proéminent)
      if (style.showPrice && labelData.price) {
        const priceText = `${labelData.price.toFixed(2)} €`;
        const fontSize = Math.max(8, (style.priceSize || 14) * scale);

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        const textWidth = doc.getTextWidth(priceText);
        const textX = contentX + (contentWidth - textWidth) / 2;

        doc.text(priceText, textX, currentY + fontSize * 0.35);
        currentY += priceHeight * scale + elementSpacing;

        console.log(
          `💰 Prix affiché: "${priceText}" à (${textX.toFixed(1)}, ${(currentY - priceHeight * scale - elementSpacing + fontSize * 0.35).toFixed(1)})`
        );
      }

      // ✅ CODE-BARRES AMÉLIORÉ AVEC CHIFFRES LISIBLES
      if (style.showBarcode && labelData.barcode && labelData.barcode.trim() !== '') {
        try {
          // Créer un canvas temporaire pour le code-barres
          const canvas = document.createElement('canvas');

          // ✅ DIMENSIONS ADAPTÉES À LA CELLULE
          const targetBarcodeWidth = Math.min(contentWidth - 1, 45);
          const targetBarcodeHeight = Math.min(barcodeHeight * scale, contentHeight * 0.5);

          // ✅ RÉSOLUTION ÉLEVÉE POUR QUALITÉ
          canvas.width = targetBarcodeWidth * 15; // Haute résolution
          canvas.height = (targetBarcodeHeight + 6) * 8; // Espace pour les chiffres

          // ✅ GÉNÉRATION CODE-BARRES AVEC CHIFFRES LISIBLES
          JsBarcode(canvas, labelData.barcode, {
            format: 'EAN13',
            width: 3, // ✅ Barres plus épaisses
            height: targetBarcodeHeight * 4, // ✅ Hauteur des barres adaptée
            displayValue: true, // ✅ AFFICHER les chiffres
            fontSize: Math.max(14, 16 * scale), // ✅ CHIFFRES PLUS GROS
            textMargin: 3, // ✅ Marge entre barres et chiffres
            fontOptions: 'bold', // ✅ Chiffres en gras
            background: '#ffffff',
            lineColor: '#000000',
            margin: 4,
          });

          // Convertir en image et ajouter au PDF
          const imgData = canvas.toDataURL('image/png');
          const barcodeX = contentX + (contentWidth - targetBarcodeWidth) / 2;
          const totalBarcodeHeight = targetBarcodeHeight + 4; // Inclut l'espace pour les chiffres

          doc.addImage(imgData, 'PNG', barcodeX, currentY, targetBarcodeWidth, totalBarcodeHeight);
          currentY += totalBarcodeHeight + elementSpacing;

          console.log(
            `🏷️ Code-barres affiché: "${labelData.barcode}" à (${barcodeX.toFixed(1)}, ${(currentY - totalBarcodeHeight - elementSpacing).toFixed(1)})`
          );
        } catch (barcodeError) {
          console.warn('Erreur génération code-barres pour', labelData.barcode, barcodeError);

          // Fallback : afficher le code en texte
          const fontSize = Math.max(6, 8 * scale);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');
          const codeWidth = doc.getTextWidth(labelData.barcode);
          const codeX = contentX + (contentWidth - codeWidth) / 2;
          doc.text(labelData.barcode, codeX, currentY + fontSize * 0.35);
          currentY += fontSize + elementSpacing;
        }
      }
    } catch (error) {
      console.error('Erreur dessin étiquette:', error);

      // Fallback : étiquette simple avec prix uniquement
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (labelData.price) {
        const priceText = `${labelData.price.toFixed(2)} €`;
        const textWidth = doc.getTextWidth(priceText);
        const textX = x + (width - textWidth) / 2;
        doc.text(priceText, textX, y + height / 2);
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
      showBorder: false, // ✅ Désactivé par défaut
      borderWidth: 0.5,
      borderColor: '#000000',
      padding: 2,
      alignment: 'center',
      showBarcode: true, // ✅ Activé par défaut
      barcodeHeight: 15,
      showPrice: true, // ✅ Activé par défaut
      priceSize: 14,
      showName: false, // ✅ Désactivé par défaut
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

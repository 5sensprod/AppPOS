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

      // ✅ FIX : Récupérer les cases désactivées
      const disabledCells = exportConfig.labelLayout?.disabledCells || [];
      console.log('🚫 Cases désactivées:', disabledCells);

      // ✅ NOUVEAU : Dupliquer les étiquettes selon duplicateCount
      const duplicateCount = style.duplicateCount || 1;
      const duplicatedLabelData = [];

      for (const label of labelData) {
        for (let i = 0; i < duplicateCount; i++) {
          duplicatedLabelData.push(label);
        }
      }

      console.log(
        `🔄 Duplication: ${labelData.length} produits × ${duplicateCount} = ${duplicatedLabelData.length} étiquettes`
      );

      console.log('🎨 Layout:', layout);
      console.log('🎨 Style:', style);
      console.log('📋 Données:', duplicatedLabelData.length, 'étiquettes');

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

      // ✅ FIX : Gérer les cases désactivées lors du placement
      let labelIndex = 0; // Index dans duplicatedLabelData
      let currentPage = 0;
      let totalCellsProcessed = 0;

      while (labelIndex < duplicatedLabelData.length) {
        // Nouvelle page si nécessaire
        if (currentPage > 0) {
          doc.addPage();
          console.log(`📄 Nouvelle page ${currentPage + 1}`);
        }

        // Traiter chaque cellule de la page
        for (
          let cellInPage = 0;
          cellInPage < labelsPerPage && labelIndex < duplicatedLabelData.length;
          cellInPage++
        ) {
          const absoluteCellIndex = currentPage * labelsPerPage + cellInPage;

          // ✅ FIX : Vérifier si cette cellule est désactivée
          if (disabledCells.includes(absoluteCellIndex)) {
            console.log(`🚫 Case ${absoluteCellIndex} ignorée (désactivée)`);
            totalCellsProcessed++;
            continue; // Passer à la cellule suivante sans placer d'étiquette
          }

          // Placer l'étiquette dans cette cellule
          const label = duplicatedLabelData[labelIndex];
          const col = cellInPage % columns;
          const row = Math.floor(cellInPage / columns);

          // ✅ CALCUL POSITION PRÉCIS
          const x = offsetLeft + col * (layout.width + spacingH);
          const y = offsetTop + row * (layout.height + spacingV);

          console.log(
            `🏷️ Étiquette ${labelIndex + 1} ("${label.name}") → Case ${absoluteCellIndex} à (${x.toFixed(1)}, ${y.toFixed(1)}) - Col ${col}, Row ${row}`
          );

          // Dessiner l'étiquette
          await this.drawLabelOnPDF(
            doc,
            label,
            { x, y, width: layout.width, height: layout.height },
            style,
            JsBarcode
          );

          labelIndex++; // Passer à l'étiquette suivante
          totalCellsProcessed++;
        }

        currentPage++;
      }

      console.log(
        `✅ Export terminé: ${labelIndex} étiquettes placées, ${totalCellsProcessed} cases traitées`
      );

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
   * ✅ Dessine une étiquette sur le PDF
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

      // ✅ NOUVEAU : CALCUL DYNAMIQUE INTELLIGENT
      let currentY = contentY;
      const elementSpacing = 1;

      // ✅ 1. CALCULER LES TAILLES RÉELLES DES ÉLÉMENTS
      const scale = 1; // On garde l'échelle fixe pour simplifier

      // Tailles effectives des éléments
      const nameHeight = style.showName ? Math.max(2.5, (style.nameSize || 10) * 0.4) : 0;
      const priceHeight = style.showPrice ? Math.max(3, (style.priceSize || 14) * 0.4) : 0;

      // ✅ HAUTEUR CODE-BARRES DYNAMIQUE (selon le réglage utilisateur)
      const barcodeBarHeight = style.showBarcode ? (style.barcodeHeight || 15) * 0.3 : 0; // Hauteur des barres
      const barcodeTextHeight = style.showBarcode ? 4 : 0; // Hauteur fixe pour le texte
      const totalBarcodeHeight = barcodeBarHeight + barcodeTextHeight;

      // ✅ 2. CALCULER L'ESPACE TOTAL NÉCESSAIRE
      const totalNeededHeight = nameHeight + priceHeight + totalBarcodeHeight + elementSpacing * 4;

      console.log(`📐 Espace disponible: ${contentHeight}mm, nécessaire: ${totalNeededHeight}mm`);
      console.log(
        `📐 Détail: nom=${nameHeight}, prix=${priceHeight}, code-barres=${totalBarcodeHeight}mm`
      );

      // ✅ 3. AJUSTEMENT INTELLIGENT
      let finalNameHeight = nameHeight;
      let finalPriceHeight = priceHeight;
      let finalBarcodeHeight = totalBarcodeHeight;

      if (totalNeededHeight > contentHeight) {
        // Si ça ne rentre pas, ajuster proportionnellement SAUF le code-barres
        const availableForFlexible = contentHeight - totalBarcodeHeight - elementSpacing * 3;
        const flexibleElementsHeight = nameHeight + priceHeight;

        if (flexibleElementsHeight > 0) {
          const reductionRatio = Math.max(0.5, availableForFlexible / flexibleElementsHeight);
          finalNameHeight = nameHeight * reductionRatio;
          finalPriceHeight = priceHeight * reductionRatio;

          console.log(`⚠️ Ajustement: ratio=${reductionRatio.toFixed(2)}, code-barres préservé`);
        }
      }

      // ✅ 4. PLACEMENT DES ÉLÉMENTS

      // ✅ NOM DU PRODUIT (en haut si activé)
      if (style.showName && labelData.name) {
        const fontSize = Math.max(6, (style.nameSize || 10) * (finalNameHeight / nameHeight));
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        // Cropping intelligent du nom (code existant)
        let displayName = labelData.name.trim();
        let textWidth = doc.getTextWidth(displayName);

        while (textWidth > contentWidth && displayName.length > 8) {
          displayName = displayName.substring(0, displayName.length - 1);
          textWidth = doc.getTextWidth(displayName + '...');
        }

        if (textWidth > contentWidth) {
          displayName = displayName + '...';
          textWidth = doc.getTextWidth(displayName);
          while (textWidth > contentWidth && displayName.length > 6) {
            displayName = displayName.substring(0, displayName.length - 4) + '...';
            textWidth = doc.getTextWidth(displayName);
          }
        } else if (displayName !== labelData.name.trim()) {
          displayName = displayName + '...';
        }

        const textX = contentX + (contentWidth - textWidth) / 2;
        doc.text(displayName, textX, currentY + fontSize * 0.35);
        currentY += finalNameHeight + elementSpacing;

        console.log(`📝 Nom: "${displayName}" hauteur=${finalNameHeight}mm`);
      }

      // ✅ PRIX (style proéminent)
      if (style.showPrice && labelData.price) {
        const priceText = `${labelData.price.toFixed(2)} €`;
        const fontSize = Math.max(8, (style.priceSize || 14) * (finalPriceHeight / priceHeight));

        doc.setFontSize(fontSize);
        doc.setFont('helvetica', 'bold');

        const textWidth = doc.getTextWidth(priceText);
        const textX = contentX + (contentWidth - textWidth) / 2;

        doc.text(priceText, textX, currentY + fontSize * 0.35);
        currentY += finalPriceHeight + elementSpacing;

        console.log(`💰 Prix: "${priceText}" hauteur=${finalPriceHeight}mm`);
      }

      // ✅ CODE-BARRES (TOUJOURS RESPECTER LA TAILLE DEMANDÉE)
      if (style.showBarcode && labelData.barcode && labelData.barcode.trim() !== '') {
        try {
          const canvas = document.createElement('canvas');

          // ✅ UTILISER LA VRAIE HAUTEUR DEMANDÉE PAR L'UTILISATEUR
          const userBarcodeHeight = (style.barcodeHeight || 15) * 0.25; // Conversion plus réaliste
          const targetBarcodeWidth = Math.min(contentWidth - 1, 35);

          canvas.width = targetBarcodeWidth * 10;
          canvas.height = userBarcodeHeight * 8;

          // Générer les barres avec la hauteur demandée
          JsBarcode(canvas, labelData.barcode, {
            format: 'EAN13',
            width: 2,
            height: userBarcodeHeight * 6, // ✅ Proportionnel à la demande utilisateur
            displayValue: false,
            background: '#ffffff',
            lineColor: '#000000',
            margin: 2,
          });

          // Position du code-barres (en bas de l'étiquette)
          const imgData = canvas.toDataURL('image/png');
          const barcodeX = contentX + (contentWidth - targetBarcodeWidth) / 2;
          const barcodeY = contentY + contentHeight - finalBarcodeHeight;

          doc.addImage(imgData, 'PNG', barcodeX, barcodeY, targetBarcodeWidth, userBarcodeHeight);

          // Texte sous le code-barres
          function formatEAN13Text(barcode) {
            const cleanBarcode = barcode.replace(/[\s-]/g, '');
            if (cleanBarcode.length === 13 && /^\d+$/.test(cleanBarcode)) {
              return `${cleanBarcode[0]} ${cleanBarcode.slice(1, 7)} ${cleanBarcode.slice(7)}`;
            }
            if (cleanBarcode.length === 8 && /^\d+$/.test(cleanBarcode)) {
              return `${cleanBarcode.slice(0, 4)} ${cleanBarcode.slice(4)}`;
            }
            if (cleanBarcode.length === 12 && /^\d+$/.test(cleanBarcode)) {
              const ean13 = '0' + cleanBarcode;
              return `${ean13[0]} ${ean13.slice(1, 7)} ${ean13.slice(7)}`;
            }
            return cleanBarcode;
          }

          const formattedText = formatEAN13Text(labelData.barcode);
          const fontSize = Math.max(7, 9);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');

          const textWidth = doc.getTextWidth(formattedText);
          const textX = contentX + (contentWidth - textWidth) / 2;
          const textY = barcodeY + userBarcodeHeight + 3;

          doc.text(formattedText, textX, textY);

          console.log(
            `🏷️ Code-barres: hauteur demandée=${style.barcodeHeight}mm, appliquée=${userBarcodeHeight}mm`
          );
        } catch (barcodeError) {
          console.warn('Erreur génération code-barres:', barcodeError);
          // Fallback simple
          const fontSize = Math.max(8, 10);
          doc.setFontSize(fontSize);
          doc.setFont('helvetica', 'normal');
          const codeWidth = doc.getTextWidth(labelData.barcode);
          const codeX = contentX + (contentWidth - codeWidth) / 2;
          doc.text(labelData.barcode, codeX, contentY + contentHeight - 5);
        }
      }

      console.log(
        `✅ Étiquette "${labelData.name}" - Espace: ${contentHeight}mm, utilisé: ${totalNeededHeight}mm`
      );
    } catch (error) {
      console.error('Erreur dessin étiquette:', error);
      // Fallback minimal
      if (labelData.price) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
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

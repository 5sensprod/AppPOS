// AppServe/controllers/productExportController.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Product = require('../models/Product');
const ResponseHandler = require('../handlers/ResponseHandler');
const iconv = require('iconv-lite');
const { createBarcodeImage } = require('../utils/barcodeGenerator');
const bwip = require('bwip-js');

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Déplacer tempDir en dehors de la classe comme variable globale
const tempDir = os.tmpdir();

class ProductExportController {
  // Ajouter cette fonction utilitaire au début de la classe ProductExportController
  /**
   * Assainit un nom de fichier en remplaçant les caractères non autorisés
   * @param {string} fileName - Le nom de fichier à assainir
   * @returns {string} - Le nom de fichier assaini
   */
  sanitizeFileName(fileName) {
    if (!fileName) return 'export';
    // Remplacer les caractères non autorisés pour Windows par des underscores
    return fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  }

  /**
   * Exporte les produits au format PDF
   * @param {Request} req - La requête Express
   * @param {Response} res - La réponse Express
   */
  async exportToPdf(req, res) {
    try {
      const {
        selectedItems = [],
        selectedColumns = [],
        orientation = 'portrait',
        title = 'Inventaire produits',
        products = [],
        customColumn = null,
      } = req.body;

      // Si aucun produit n'est fourni directement, les récupérer par ID
      let productsToExport = products;
      if (products.length === 0 && selectedItems.length > 0) {
        productsToExport = await this.fetchProductsByIds(selectedItems);
      }

      if (productsToExport.length === 0) {
        return ResponseHandler.badRequest(res, 'Aucun produit à exporter');
      }

      // Générer un nom de fichier unique avec sanitization
      const sanitizedTitle = this.sanitizeFileName(title);
      const filename = `${sanitizedTitle}_${Date.now()}.pdf`;

      // Vérifier que le dossier temporaire existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, filename);

      // Reste du code inchangé...
      await this.generatePdf(
        tempFilePath,
        productsToExport,
        selectedColumns,
        title,
        orientation,
        customColumn
      );

      // Envoyer le fichier en réponse
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Lire le fichier et l'envoyer comme réponse
      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      // Nettoyer le fichier temporaire après l'envoi
      fileStream.on('end', () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier temporaire:', err);
        });
      });
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Exporte les produits au format CSV
   * @param {Request} req - La requête Express
   * @param {Response} res - La réponse Express
   */
  async exportToCsv(req, res) {
    try {
      const {
        selectedItems = [],
        selectedColumns = [],
        title = 'Inventaire produits',
        products = [],
        customColumn = null,
      } = req.body;

      // Si aucun produit n'est fourni directement, les récupérer par ID
      let productsToExport = products;
      if (products.length === 0 && selectedItems.length > 0) {
        productsToExport = await this.fetchProductsByIds(selectedItems);
      }

      if (productsToExport.length === 0) {
        return ResponseHandler.badRequest(res, 'Aucun produit à exporter');
      }

      // Générer un nom de fichier unique avec sanitization
      const sanitizedTitle = this.sanitizeFileName(title);
      const filename = `${sanitizedTitle}_${Date.now()}.csv`;

      // Vérifier que le dossier temporaire existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, filename);

      // Générer le contenu CSV
      const csvContent = this.generateCsv(productsToExport, selectedColumns, customColumn);

      // Encoder avec Windows-1252 pour P-touch
      const csvBuffer = iconv.encode(csvContent, 'win1252');
      fs.writeFileSync(tempFilePath, csvBuffer);

      // Envoyer le fichier en réponse avec le bon charset
      res.setHeader('Content-Type', 'text/csv; charset=Windows-1252');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(tempFilePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier temporaire:', err);
        });
      });
    } catch (error) {
      console.error("Erreur lors de l'export CSV:", error);
      return ResponseHandler.error(res, error);
    }
  }

  /**
   * Récupère les produits par leurs IDs
   * @param {Array} ids - Les IDs des produits
   * @returns {Array} - Les produits récupérés
   */
  async fetchProductsByIds(ids) {
    const products = [];

    for (const id of ids) {
      const product = await Product.findByIdWithCategoryInfo(id);
      if (product) {
        products.push(product);
      }
    }

    return products;
  }

  /**
   * Génère un document PDF avec les produits
   * @param {string} filePath - Le chemin du fichier PDF à générer
   * @param {Array} products - Les produits à inclure
   * @param {Array} selectedColumns - Les colonnes à inclure
   * @param {string} title - Le titre du document
   * @param {string} orientation - L'orientation du document (portrait ou landscape)
   * @param {Object} customColumn - La configuration de la colonne personnalisée (optionnel)
   */
  async generatePdf(filePath, products, selectedColumns, title, orientation, customColumn = null) {
    // Déterminer les dimensions du document selon l'orientation
    const isLandscape = orientation === 'landscape';
    const pageSize = isLandscape ? [841.89, 595.28] : [595.28, 841.89]; // A4 en points

    // Réduire les marges pour maximiser l'espace du tableau
    const margins = { top: 40, bottom: 40, left: 30, right: 30 };

    // Créer un nouveau document PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: orientation,
      margins: margins,
      bufferPages: true, // Permet de modifier les pages après leur création (pour numéros de page)
      info: {
        Title: title,
        Author: "Système de gestion d'inventaire",
        Subject: 'Export de produits',
        Keywords: 'produits, inventaire, export',
        Creator: 'ProductExportController',
      },
    });

    // Créer un flux de sortie vers le fichier
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Entête du document
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
    doc.moveDown(1);

    // Déterminer les colonnes à afficher
    const columnsConfig = this.getColumnsConfig(selectedColumns);

    // Ajouter la colonne personnalisée si demandée
    if (customColumn && customColumn.title) {
      columnsConfig.push({
        key: 'custom',
        label: customColumn.title,
        weight: 2,
        isCustom: true,
      });
    }

    // Déterminer la largeur disponible pour le tableau
    const availableWidth = pageSize[0] - margins.left - margins.right;

    // Répartir la largeur entre les colonnes sélectionnées
    const columnWidths = {};

    // Attribution des largeurs en pourcentage
    let totalWeight = columnsConfig.reduce((sum, col) => sum + col.weight, 0);
    columnsConfig.forEach((col) => {
      columnWidths[col.key] = (col.weight / totalWeight) * availableWidth;
    });

    // Calculer la hauteur de ligne adaptative selon le contenu
    const calculateRowHeight = (product, columnsConfig, columnWidths, fontSize = 10) => {
      // Hauteur minimale de ligne
      let rowHeight = 20;

      // NOUVEAU : Vérifier si on a une colonne barcode avec une valeur
      const hasBarcodeColumn = columnsConfig.some((col) => {
        if (col.key === 'barcode') {
          const barcodeItem = product.meta_data?.find((item) => item.key === 'barcode');
          return barcodeItem?.value; // Retourne true si le produit a un code-barres
        }
        return false;
      });

      // Si on a un code-barres, augmenter la hauteur pour laisser la place
      if (hasBarcodeColumn) {
        rowHeight = Math.max(rowHeight, 45); // 45px pour le code-barres + chiffres
      }

      // Vérifier chaque colonne pour le texte
      for (const col of columnsConfig) {
        // Pour la colonne personnalisée, utiliser une hauteur standard
        if (col.isCustom) continue;

        // Pour la colonne barcode, on a déjà défini la hauteur ci-dessus
        if (col.key === 'barcode') continue;

        const value = this.formatCellValue(product, col.key);
        const width = columnWidths[col.key] - 10; // Moins les marges intérieures

        // Traitement spécial pour les catégories qui peuvent contenir des sauts de ligne
        if (col.key === 'category' && value.includes('\n')) {
          const lines = value.split('\n').length;
          const categoryHeight = lines * (fontSize * 1.2) + 4; // 1.2 pour l'interligne + 4px de marge
          rowHeight = Math.max(rowHeight, categoryHeight);
          continue;
        }

        // Estimer le nombre de lignes nécessaires pour les autres colonnes
        const charsPerLine = Math.floor(width / (fontSize * 0.5));
        if (charsPerLine <= 0) continue;

        const lines = Math.ceil(value.length / charsPerLine);
        const cellHeight = lines * (fontSize * 1.2) + 4; // 1.2 pour l'interligne + 4px de marge

        rowHeight = Math.max(rowHeight, cellHeight);
      }

      return rowHeight;
    };

    // Dessiner l'entête du tableau
    let y = doc.y;
    const headerHeight = 25; // Hauteur fixe pour l'entête

    // Dessiner le fond de l'entête
    doc.fillColor('#f3f4f6').rect(margins.left, y, availableWidth, headerHeight).fill();
    doc
      .strokeColor('#000000')
      .lineWidth(0.5)
      .rect(margins.left, y, availableWidth, headerHeight)
      .stroke();

    // Dessiner le texte de l'entête
    doc.fillColor('#000000').font('Helvetica-Bold');
    let x = margins.left;

    columnsConfig.forEach((col) => {
      // Capitaliser la première lettre du label
      const label = col.label.charAt(0).toUpperCase() + col.label.slice(1).toLowerCase();

      doc.text(
        label,
        x + 5,
        y + headerHeight / 2 - 6, // Centrer verticalement (-6 pour compenser la hauteur de la police)
        {
          width: columnWidths[col.key] - 10,
          align: 'left',
        }
      );

      // Tracer la ligne verticale de séparation (sauf pour la dernière colonne)
      if (col !== columnsConfig[columnsConfig.length - 1]) {
        doc
          .moveTo(x + columnWidths[col.key], y)
          .lineTo(x + columnWidths[col.key], y + headerHeight)
          .stroke();
      }

      x += columnWidths[col.key];
    });

    y += headerHeight;

    // Dessiner les lignes du tableau
    doc.font('Helvetica');

    // Limites de pagination
    const footerHeight = 30;
    const maxY = pageSize[1] - margins.bottom - footerHeight;
    let pageNum = 1;

    // Dessiner les lignes de données
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Calculer la hauteur nécessaire pour cette ligne
      const rowHeight = calculateRowHeight(product, columnsConfig, columnWidths);

      // Vérifier si on doit passer à une nouvelle page
      if (y + rowHeight > maxY) {
        // Ajouter le pied de page de la page actuelle
        doc.fontSize(8).text(`Page ${pageNum}`, margins.left, pageSize[1] - margins.bottom - 15, {
          align: 'center',
          width: availableWidth,
        });

        // Créer une nouvelle page
        doc.addPage({
          size: 'A4',
          layout: orientation,
          margins: margins,
        });

        pageNum++;
        y = margins.top;

        // Redessiner l'entête du tableau sur la nouvelle page
        doc.fillColor('#f3f4f6').rect(margins.left, y, availableWidth, headerHeight).fill();
        doc
          .strokeColor('#000000')
          .lineWidth(0.5)
          .rect(margins.left, y, availableWidth, headerHeight)
          .stroke();

        doc.fillColor('#000000').font('Helvetica-Bold');
        x = margins.left;

        columnsConfig.forEach((col) => {
          // Capitaliser la première lettre du label
          const label = col.label.charAt(0).toUpperCase() + col.label.slice(1).toLowerCase();

          doc.text(label, x + 5, y + headerHeight / 2 - 6, {
            width: columnWidths[col.key] - 10,
            align: 'left',
          });

          if (col !== columnsConfig[columnsConfig.length - 1]) {
            doc
              .moveTo(x + columnWidths[col.key], y)
              .lineTo(x + columnWidths[col.key], y + headerHeight)
              .stroke();
          }

          x += columnWidths[col.key];
        });

        y += headerHeight;
      }

      // Alterner les couleurs de fond
      const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.fillColor(bgColor).rect(margins.left, y, availableWidth, rowHeight).fill();
      doc
        .strokeColor('#d1d5db')
        .lineWidth(0.5)
        .rect(margins.left, y, availableWidth, rowHeight)
        .stroke();

      // Dessiner le contenu de la ligne
      doc.fillColor('#000000').font('Helvetica').fontSize(10);
      x = margins.left;

      for (const col of columnsConfig) {
        // Tracer la ligne verticale de séparation (sauf pour la dernière colonne)
        if (col !== columnsConfig[columnsConfig.length - 1]) {
          doc
            .strokeColor('#d1d5db')
            .lineWidth(0.5)
            .moveTo(x + columnWidths[col.key], y)
            .lineTo(x + columnWidths[col.key], y + rowHeight)
            .stroke();
        }

        // Traitement spécial pour la colonne personnalisée
        if (col.isCustom) {
          // Pour la colonne personnalisée, dessiner un cadre vide pour le remplissage manuel
          doc
            .strokeColor('#000000')
            .lineWidth(0.1)
            .rect(x + 5, y + 3, columnWidths[col.key] - 10, rowHeight - 6)
            .stroke();
        } else {
          // ✅ 4. CORRECTION CODES-BARRES AVEC AWAIT
          if (col.key === 'barcode') {
            const barcodeItem = product.meta_data?.find((item) => item.key === 'barcode');
            if (barcodeItem?.value) {
              try {
                // ✅ AWAIT fonctionne maintenant car generatePdf est async
                const imageBuffer = await createBarcodeImage(barcodeItem.value, {
                  width: 1.5,
                  height: 35,
                  fontSize: 8,
                  margin: 3,
                });

                // Vérifier que c'est bien un Buffer
                if (!Buffer.isBuffer(imageBuffer)) {
                  throw new Error("createBarcodeImage n'a pas retourné un Buffer valide");
                }

                // Calculer les dimensions pour que le code-barres s'adapte à la cellule
                const maxWidth = columnWidths[col.key] - 10;
                const maxHeight = rowHeight - 10;

                // Ajouter l'image du code-barres au PDF
                doc.image(imageBuffer, x + 5, y + 5, {
                  width: Math.min(maxWidth, 120),
                  height: Math.min(maxHeight, 30),
                });

                console.log(`✅ Code-barres PDF ajouté (bwip-js) pour produit ${product.sku}`);
              } catch (error) {
                console.error(
                  `❌ Erreur affichage code-barres bwip-js pour ${product.sku}:`,
                  error
                );
                // Fallback : afficher le texte du code-barres
                const value = this.formatCellValue(product, col.key);
                doc
                  .fillColor('#000000')
                  .font('Helvetica')
                  .fontSize(10)
                  .text(value, x + 5, y + 5, {
                    width: columnWidths[col.key] - 10,
                    align: 'left',
                  });
              }
            } else {
              // Pas de code-barres, afficher un tiret
              doc
                .fillColor('#000000')
                .font('Helvetica')
                .fontSize(10)
                .text('-', x + 5, y + 5, {
                  width: columnWidths[col.key] - 10,
                  align: 'left',
                });
            }
          } else {
            // Pour les colonnes normales, afficher la valeur (code existant inchangé)
            const value = this.formatCellValue(product, col.key);

            // Traitement spécial pour la colonne catégorie qui peut contenir des sauts de ligne
            if (col.key === 'category' && value.includes('\n')) {
              const lines = value.split('\n');

              // Première ligne (catégorie principale) en taille normale
              doc
                .font('Helvetica')
                .fontSize(10)
                .text(lines[0], x + 5, y + 5, { width: columnWidths[col.key] - 10, align: 'left' });

              // Lignes suivantes (chemin et autres catégories) en plus petit et gris
              doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor('#6B7280')
                .text(lines.slice(1).join('\n'), x + 5, doc.y, {
                  width: columnWidths[col.key] - 10,
                  align: 'left',
                })
                .fillColor('#000000');
            } else {
              // Dessiner la valeur de la cellule pour les autres colonnes
              doc
                .fillColor('#000000')
                .font('Helvetica')
                .fontSize(10)
                .text(value, x + 5, y + 5, {
                  width: columnWidths[col.key] - 10,
                  align:
                    col.key === 'stock' || col.key === 'price' || col.key === 'purchase_price'
                      ? 'right'
                      : 'left',
                });
            }
          }
        }

        x += columnWidths[col.key];
      } // ✅ Fermer le for...of (remplace le });

      y += rowHeight;
    }

    // Ajouter le pied de page avec le nombre total sur la dernière page (reste sur la même page)
    // S'assurer qu'il y a assez d'espace, sinon ajouter une nouvelle page
    if (y + 40 > maxY) {
      // Ajouter numéro de page
      doc.fontSize(8).text(`Page ${pageNum}`, margins.left, pageSize[1] - margins.bottom - 15, {
        align: 'center',
        width: availableWidth,
      });

      // Nouvelle page pour le total
      doc.addPage({ size: 'A4', layout: orientation, margins: margins });
      pageNum++;
      y = margins.top;
    } else {
      // Laisser un peu d'espace
      y += 10;
    }

    // Ajouter le total des produits
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Total: ${products.length} produit${products.length > 1 ? 's' : ''}`, margins.left, y, {
        align: 'right',
        width: availableWidth,
      });

    // Ajouter numéro de page sur la dernière page
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(`Page ${pageNum}`, margins.left, pageSize[1] - margins.bottom - 15, {
        align: 'center',
        width: availableWidth,
      });

    // Finaliser le document
    doc.end();

    // Attendre que le fichier soit écrit
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  /**
   * Génère un fichier CSV avec les produits
   *
   * @param {Array} products - Les produits à inclure
   * @param {Array} selectedColumns - Les colonnes à inclure
   * @param {Object} customColumn - La configuration de la colonne personnalisée (optionnel)
   * @returns {string} - Le contenu CSV
   */
  generateCsv(products, selectedColumns, customColumn = null) {
    const columnsConfig = this.getColumnsConfig(selectedColumns);

    // Ajouter la colonne personnalisée si demandée
    if (customColumn && customColumn.title) {
      columnsConfig.push({
        key: 'custom',
        label: customColumn.title,
        isCustom: true,
      });
    }

    // Entête CSV
    let csv =
      columnsConfig
        .map((col) => {
          // Capitaliser la première lettre
          const label = col.label.charAt(0).toUpperCase() + col.label.slice(1).toLowerCase();
          return `"${label}"`;
        })
        .join(',') + '\n';

    // Lignes de données
    products.forEach((product) => {
      const row = columnsConfig
        .map((col) => {
          if (col.isCustom) {
            return '""'; // Cellule vide pour la colonne personnalisée
          }

          // Traitement spécial pour les catégories dans le CSV
          if (col.key === 'category') {
            if (product.category_info && product.category_info.primary) {
              const primary = product.category_info.primary;
              let categoryText = primary.name || '-';

              // Ajouter le chemin complet si disponible, mais avec " - " au lieu de sauts de ligne
              if (primary.path && primary.path.length > 1) {
                categoryText += ` - ${primary.path_string || primary.path.join(' > ')}`;
              }

              // Ajouter le nombre d'autres catégories si présentes
              if (product.category_info.refs && product.category_info.refs.length > 1) {
                categoryText += ` (+${product.category_info.refs.length - 1} autres)`;
              }

              // Première lettre en majuscule
              return `"${(categoryText.charAt(0).toUpperCase() + categoryText.slice(1).toLowerCase()).replace(/"/g, '""')}"`;
            }
            return '"-"';
          }

          const value = this.formatCellValue(product, col.key);
          // Remplacer les sauts de ligne par des espaces pour le CSV
          const formattedValue = value.replace(/\n/g, ' - ');
          return `"${formattedValue.replace(/"/g, '""')}"`;
        })
        .join(',');

      csv += row + '\n';
    });

    return csv;
  }

  /**
   * Retourne la configuration des colonnes
   * @param {Array} selectedColumns - Les colonnes sélectionnées
   * @returns {Array} - La configuration des colonnes
   */
  getColumnsConfig(selectedColumns) {
    // Configuration de toutes les colonnes disponibles
    const allColumns = [
      { key: '_id', label: 'ID', weight: 2 }, // Ajout de l'ID
      { key: 'sku', label: 'Référence', weight: 2 },
      { key: 'designation', label: 'Désignation', weight: 3 },
      { key: 'name', label: 'Nom', weight: 3 },
      { key: 'barcode', label: 'Code-barres', weight: 2 }, // ← REMETTRE cette ligne
      { key: 'purchase_price', label: "Prix d'achat", weight: 1.5 },
      { key: 'price', label: 'Prix de vente', weight: 1.5 },
      { key: 'stock', label: 'Stock', weight: 1 },
      { key: 'category', label: 'Catégorie', weight: 2 },
      { key: 'supplier_brand_path', label: 'Marque/Fournisseur', weight: 2 },
      { key: 'woo_status', label: 'Statut WEB', weight: 1.5 },
      { key: 'description', label: 'Description', weight: 4 },
    ];

    // Si aucune colonne n'est sélectionnée, utiliser toutes les colonnes
    if (!selectedColumns || selectedColumns.length === 0) {
      return allColumns;
    }

    // Filtrer les colonnes selon la sélection
    return allColumns.filter((col) => selectedColumns.includes(col.key));
  }

  /**
   * Formate la valeur d'une cellule
   * @param {Object} product - Le produit
   * @param {string} key - La clé de la colonne
   * @returns {string} - La valeur formatée
   */
  formatCellValue(product, key) {
    switch (key) {
      case '_id': // Ajout du cas pour l'ID
        return product[key] || '-';

      case 'purchase_price':
      case 'price':
        return product[key] ? formatCurrency(product[key]) : formatCurrency(0);

      case 'stock':
        return product[key]?.toString() || '0';

      case 'barcode':
        const barcodeItem = product.meta_data?.find((item) => item.key === 'barcode');
        return barcodeItem?.value || '';

      case 'category':
        if (product.category_info && product.category_info.primary) {
          const primary = product.category_info.primary;
          let categoryText = primary.name || '-';

          // Ajouter le chemin complet si disponible
          if (primary.path && primary.path.length > 1) {
            categoryText += `\n${primary.path_string || primary.path.join(' > ')}`;
          }

          // Ajouter le nombre d'autres catégories si présentes
          if (product.category_info.refs && product.category_info.refs.length > 1) {
            categoryText += `\n(+${product.category_info.refs.length - 1} autres)`;
          }

          // Première lettre en majuscule pour la catégorie principale
          return categoryText.charAt(0).toUpperCase() + categoryText.slice(1).toLowerCase();
        }
        return '-';

      case 'supplier_brand_path':
        const brand = product.brand_ref?.name || '-';
        const supplier = product.supplier_ref?.name || '-';
        // Première lettre en majuscule
        return `${brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()} (${supplier})`;

      case 'woo_status':
        if (product.woo_id) {
          if (product.status === 'published') return 'Publié';
          if (product.status === 'draft') return 'Brouillon';
          return 'Synchronisé';
        }
        return 'Non synchronisé';

      case 'description':
        const desc = product[key] || '';
        // Première lettre en majuscule si non vide
        return desc
          ? desc.charAt(0).toUpperCase() +
              desc.slice(1).toLowerCase().replace(/\n/g, ' ').substring(0, 100) +
              (desc.length > 100 ? '...' : '')
          : '-';

      default:
        const val = product[key]?.toString() || '-';
        // Première lettre en majuscule si non vide et pas un nombre
        return val !== '-' && isNaN(val)
          ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
          : val;
    }
  }
}

// Créer instance du contrôleur
const productExportController = new ProductExportController();

// Exporter les méthodes individuellement
module.exports = {
  exportToPdf: productExportController.exportToPdf.bind(productExportController),
  exportToCsv: productExportController.exportToCsv.bind(productExportController),
};

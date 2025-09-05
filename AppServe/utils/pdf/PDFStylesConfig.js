// AppServe/utils/pdf/PDFStylesConfig.js

/**
 * Configuration centralisée des styles pour PDFKit
 * Remplace l'ancienne logique CSS pour html-pdf
 */
class PDFStylesConfig {
  constructor() {
    this.colors = {
      black: '#000000',
      white: '#FFFFFF',
      gray: '#666666',
      lightGray: '#CCCCCC',
      darkGray: '#333333',
      border: '#000000',
    };

    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
    };
  }

  /**
   * 📏 Tailles de police par défaut
   */
  getDefaultSizes() {
    return {
      // Titres
      mainTitle: 18,
      sectionTitle: 12,
      categoryTitle: 11,

      // Tableaux
      tableHeader: 10,
      tableCell: 11,

      // Métriques
      metricValue: 14,
      metricLabel: 8,

      // Texte général
      bodyText: 11,
      smallText: 10,
      footerText: 9,
    };
  }

  /**
   * 🎨 Styles pour les rapports de synthèse
   */
  getSummaryStyles() {
    const sizes = this.getDefaultSizes();

    return {
      header: {
        title: {
          font: this.fonts.bold,
          fontSize: sizes.mainTitle,
          color: this.colors.black,
        },
        subtitle: {
          font: this.fonts.regular,
          fontSize: sizes.bodyText,
          color: this.colors.darkGray,
        },
      },

      company: {
        name: {
          font: this.fonts.bold,
          fontSize: sizes.sectionTitle,
          color: this.colors.black,
        },
        details: {
          font: this.fonts.regular,
          fontSize: sizes.smallText,
          color: this.colors.darkGray,
        },
      },

      metrics: {
        sectionTitle: {
          font: this.fonts.bold,
          fontSize: sizes.sectionTitle,
          color: this.colors.black,
        },
        label: {
          font: this.fonts.regular,
          fontSize: sizes.metricLabel,
          color: this.colors.darkGray,
        },
        value: {
          font: this.fonts.bold,
          fontSize: sizes.metricValue,
          color: this.colors.black,
        },
        subtitle: {
          font: this.fonts.regular,
          fontSize: sizes.footerText,
          color: this.colors.gray,
        },
      },

      table: {
        header: {
          font: this.fonts.bold,
          fontSize: 9, // Réduit pour éviter les débordements
          color: this.colors.black,
          fillColor: this.colors.white,
          borderColor: this.colors.border,
        },
        cell: {
          font: this.fonts.regular,
          fontSize: 9, // Réduit pour une meilleure lisibilité
          color: this.colors.black,
          borderColor: this.colors.border,
        },
        totals: {
          font: this.fonts.bold,
          fontSize: 9, // Cohérent avec les autres cellules
          color: this.colors.black,
          borderColor: this.colors.border,
        },
      },

      summary: {
        title: {
          font: this.fonts.bold,
          fontSize: sizes.categoryTitle,
          color: this.colors.black,
        },
        text: {
          font: this.fonts.regular,
          fontSize: sizes.bodyText,
          color: this.colors.black,
        },
        highlight: {
          font: this.fonts.bold,
          fontSize: sizes.bodyText,
          color: this.colors.black,
        },
      },
    };
  }

  /**
   * 📊 Styles pour les rapports détaillés
   */
  getDetailedStyles() {
    const baseStyles = this.getSummaryStyles();

    // Adaptation pour le format paysage et tableaux plus denses
    return {
      ...baseStyles,
      table: {
        ...baseStyles.table,
        header: {
          ...baseStyles.table.header,
          fontSize: 9,
        },
        cell: {
          ...baseStyles.table.cell,
          fontSize: 10,
        },
      },
    };
  }

  /**
   * 🎯 Obtient les styles selon le type de rapport
   */
  getStylesForReport(reportType, options = {}) {
    switch (reportType) {
      case 'summary':
        return this.getSummaryStyles();
      case 'detailed':
        return this.getDetailedStyles();
      default:
        return this.getSummaryStyles();
    }
  }

  /**
   * 📐 Dimensions et espacement
   */
  getLayout() {
    return {
      // Marges internes
      padding: {
        section: 15,
        box: 10,
        cell: 5,
      },

      // Espacement vertical
      spacing: {
        afterHeader: 20,
        betweenSections: 15,
        afterTitle: 10,
        betweenMetrics: 8,
        tableRowHeight: 20,
      },

      // Dimensions des éléments
      dimensions: {
        borderWidth: 1,
        headerBorderWidth: 2,
        metricBoxHeight: 60,
        tableHeaderHeight: 25,
      },
    };
  }

  /**
   * 📊 Configuration des tableaux
   */
  getTableConfig() {
    return {
      // Largeurs de colonnes pour le tableau TVA (en pourcentage)
      taxTableColumns: {
        rate: 20, // Taux TVA
        count: 12, // Nb Produits
        inventory: 17, // Valeur Achat
        retail: 17, // Valeur Vente
        tax: 17, // TVA Collectée
        margin: 17, // Marge Brute
      },

      // Configuration générale
      cellPadding: 5,
      borderWidth: 1,
      headerHeight: 25,
      rowHeight: 20,
    };
  }
}

module.exports = PDFStylesConfig;

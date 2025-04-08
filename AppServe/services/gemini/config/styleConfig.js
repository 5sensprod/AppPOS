// services/gemini/config/styleConfig.js

/**
 * Configuration des styles HTML pour les fiches produit
 * Cela permet de centraliser tous les styles et de les modifier facilement
 */
module.exports = {
  // Conteneur principal
  container: {
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    margin: '0',
    padding: '0',
  },

  // Titre principal h1
  title: {
    fontSize: '24px',
    margin: '0 0 15px 0',
    padding: '0',
    color: '#333',
  },

  // Section de description
  description: {
    container: {
      margin: '0 0 20px 0',
    },
    text: {
      margin: '0',
      padding: '0',
    },
  },

  // Titres de section h2
  sectionTitle: {
    fontSize: '20px',
    margin: '25px 0 15px 0',
    padding: '0',
    color: '#333',
  },

  // Listes à puces
  list: {
    container: {
      margin: '0 0 20px 0',
      padding: '0 0 0 20px',
      listStyleType: 'disc',
    },
    item: {
      margin: '0 0 8px 0',
      padding: '0',
    },
    lastItem: {
      margin: '0 0 0 0',
      padding: '0',
    },
  },

  // Tableau des caractéristiques
  table: {
    container: {
      width: '100%',
      borderCollapse: 'collapse',
      margin: '0 0 20px 0',
    },
    headerRow: {
      backgroundColor: '#f5f5f5',
    },
    headerCell: {
      textAlign: 'left',
      padding: '10px',
      border: '1px solid #ddd',
      width: '40%',
    },
    headerCellValue: {
      textAlign: 'left',
      padding: '10px',
      border: '1px solid #ddd',
      width: '60%',
    },
    cell: {
      padding: '10px',
      border: '1px solid #ddd',
    },
  },

  // Obtenir tous les styles sous forme de chaînes CSS inline
  getInlineStyles() {
    return {
      container: this._objectToCssString(this.container),
      title: this._objectToCssString(this.title),
      descriptionContainer: this._objectToCssString(this.description.container),
      descriptionText: this._objectToCssString(this.description.text),
      sectionTitle: this._objectToCssString(this.sectionTitle),
      listContainer: this._objectToCssString(this.list.container),
      listItem: this._objectToCssString(this.list.item),
      listLastItem: this._objectToCssString(this.list.lastItem),
      tableContainer: this._objectToCssString(this.table.container),
      tableHeaderRow: this._objectToCssString(this.table.headerRow),
      tableHeaderCell: this._objectToCssString(this.table.headerCell),
      tableHeaderCellValue: this._objectToCssString(this.table.headerCellValue),
      tableCell: this._objectToCssString(this.table.cell),
    };
  },

  // Convertit un objet de style en chaîne CSS pour les attributs style=""
  _objectToCssString(styleObj) {
    return Object.entries(styleObj)
      .map(([key, value]) => {
        // Convertir camelCase en kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  },
};

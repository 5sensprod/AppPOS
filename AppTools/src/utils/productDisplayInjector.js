// src/utils/productDisplayInjector.js
const styles = require('../ui/productDisplayConfig');

/**
 * Génère le script d'injection pour l'affichage des produits
 */
function generateProductDisplayScript(products) {
  if (!products?.length) return '(function() { console.log("Aucun produit à afficher"); })();';

  return `
    (function() {
      const products = ${JSON.stringify(products)};
      console.log("Affichage de", products.length, "produits");
      
      // Styles
      const styles = ${JSON.stringify(styles)};
      
      // DOM
      const container = Object.assign(document.createElement('div'), {
        id: 'app-selected-products',
        style: styles.container
      });
      
      container.appendChild(Object.assign(document.createElement('h3'), {
        textContent: 'Produits sélectionnés (' + products.length + ')',
        style: styles.title
      }));
      
      const list = Object.assign(document.createElement('ul'), {
        style: styles.list
      });
      
      products.forEach((product, index) => {
        const item = document.createElement('li');
        item.style = styles.item + (index < products.length - 1 ? styles.itemBorder : '');
        item.innerHTML = '<strong>' + (product.designation || 'Sans désignation') + '</strong><br>' + 
                         '<span style="' + styles.skuText + '">SKU: ' + (product.sku || 'Sans SKU') + '</span>';
        
        item.addEventListener('mouseover', () => item.style.backgroundColor = styles.itemHover);
        item.addEventListener('mouseout', () => item.style.backgroundColor = '');
        item.addEventListener('click', () => {
          const searchTerm = product.designation || product.sku;
          window.location.href = window.location.href.split(/[#?]/)[0] + '?q=' + encodeURIComponent(searchTerm);
        });
        
        list.appendChild(item);
      });
      
      container.appendChild(list);
      
      container.appendChild(Object.assign(document.createElement('button'), {
        textContent: '×',
        style: styles.closeButton,
        onclick: () => document.body.removeChild(container)
      }));
      
      document.body.appendChild(container);
    })();
  `;
}

/**
 * Injecte le script d'affichage des produits
 */
async function injectProductDisplay(webContents, products) {
  try {
    return await webContents.executeJavaScript(generateProductDisplayScript(products));
  } catch (err) {
    console.error("Erreur d'injection:", err);
    return false;
  }
}

module.exports = { generateProductDisplayScript, injectProductDisplay };

const fs = require('fs');
const path = require('path');

/**
 * Injecte le CSS puis le script d’injection, en passant directement
 * l’objet products (et non une chaîne JSON à parser).
 */
async function injectProductContentSelector(webContents, products) {
  try {
    // 1) CSS
    const cssPath = path.resolve(__dirname, '../injected/productContentSelector.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    await webContents.insertCSS(css);

    // 2) Script
    const scriptPath = path.resolve(__dirname, '../injected/productContentSelector.js');
    let script = fs.readFileSync(scriptPath, 'utf-8');
    // On remplace le placeholder par le JSON littéral (pas de backticks ici)
    const productsJson = JSON.stringify(products);
    script = script.replace('/*PLACEHOLDER_PRODUCTS*/', productsJson);

    // 3) Exécution
    return await webContents.executeJavaScript(script);
  } catch (err) {
    console.error("Erreur d'injection du sélecteur de contenu :", err);
    return false;
  }
}

module.exports = {
  injectProductContentSelector,
};

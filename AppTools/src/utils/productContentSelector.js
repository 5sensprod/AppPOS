// AppTools\src\utils\productContentSelector.js
const fs = require('fs');
const path = require('path');

/**
 * Injecte le CSS puis les modules du sélecteur de contenu.
 * @param {WebContents} webContents - L'objet webContents d'Electron
 * @param {Array} products - Liste des produits à manipuler
 * @returns {Promise<boolean>} Succès de l'injection
 */
async function injectProductContentSelector(webContents, products) {
  try {
    // 1) CSS - Utilisation du fichier CSS externe
    const cssPath = path.resolve(__dirname, '../injected/productContentSelector.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    await webContents.insertCSS(css);
    console.log('✅ CSS injecté avec succès');

    // 2) Approche modulaire - injecter chaque module individuellement
    const modulesDir = path.resolve(__dirname, '../injected/modules');
    const moduleFiles = [
      'productSelectorConfig.js',
      'productSelectorCommunication.js',
      'productSelectorUI.js',
      'productSelectorNavigation.js',
      'productSelectorSelection.js',
      'productSelectorProductManager.js',
      'productSelectorInteractionBlocker.js',
    ];

    // Injecter chaque module dans l'ordre
    for (const moduleFile of moduleFiles) {
      try {
        const modulePath = path.join(modulesDir, moduleFile);
        if (fs.existsSync(modulePath)) {
          const moduleCode = fs.readFileSync(modulePath, 'utf-8');
          await webContents.executeJavaScript(`
            (function(){
              ${moduleCode}
              // on termine sans return pour que ça renvoie undefined
            })()
          `);
          console.log(`✅ Module ${moduleFile} injecté avec succès`);
        } else {
          console.warn(`⚠️ Module ${moduleFile} non trouvé`);
        }
      } catch (moduleErr) {
        console.error(`❌ Erreur lors de l'injection du module ${moduleFile}:`, moduleErr);
      }
    }

    // 3) Script principal
    const scriptPath = path.resolve(__dirname, '../injected/productContentSelector.js');
    let script = fs.readFileSync(scriptPath, 'utf-8');

    // Remplacer le placeholder par les produits
    const productsJson = JSON.stringify(products);
    script = script.replace('/*PLACEHOLDER_PRODUCTS*/', productsJson);

    // Exécution du script principal
    console.log('🔄 Injection du script principal en cours...');
    const result = await webContents.executeJavaScript(script);
    console.log('✅ Script principal injecté avec succès');

    return result;
  } catch (err) {
    console.error("❌ Erreur d'injection du sélecteur de contenu :", err);
    return false;
  }
}

module.exports = {
  injectProductContentSelector,
};

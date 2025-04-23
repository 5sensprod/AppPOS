// File: AppTools/src/ui/productContentConfig.js

/**
 * Styles inline pour le sélecteur de contenu produit
 * Chaque propriété est une chaîne CSS pouvant être injectée dans un <style> ou utilisée en inline style.
 */
module.exports = {
  container: `
      position: fixed;
      top: 0;
      right: 0;
      width: 350px;
      height: 100%;
      background: #fff;
      box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      padding: 20px;
      overflow-y: auto;
    `,
  navRow: `
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    `,
  badge: `
      padding: 4px 8px;
      background: #e0e0e0;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 5px;
    `,
  btn: `
      padding: 8px 15px;
      background: #4CAF50;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 5px;
      font-size: 13px;
    `,
  btnSmall: `
      padding: 2px 5px;
      font-size: 11px;
      float: right;
      margin: 0;
    `,
  btnSecondary: `
      background: #9e9e9e;
    `,
  btnDisabled: `
      opacity: 0.5;
      cursor: not-allowed;
    `,
  input: `
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    `,
  activeInput: `
      border: 2px solid #4CAF50 !important;
      background: rgba(76,175,80,0.05) !important;
    `,
  textHighlight: `
      background: rgba(255,255,0,0.2) !important;
      border-radius: 3px;
      cursor: pointer;
    `,
  imageHighlight: `
      outline: 3px solid rgba(0,255,255,0.7) !important;
      cursor: pointer;
    `,
  imageSelected: `
      outline: 3px solid rgba(0,128,255,0.7) !important;
    `,
  feedback: `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s;
    `,
  imagePreview: `
      max-width: 80px;
      max-height: 80px;
      margin: 5px;
      border: 1px solid #ddd;
      cursor: pointer;
    `,
};

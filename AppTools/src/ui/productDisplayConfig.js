// src/ui/productDisplayConfig.js
// Styles et configuration UI pour l'affichage des produits
module.exports = {
  container:
    'position:fixed;top:10px;right:10px;background:white;border:1px solid #ccc;border-radius:5px;padding:15px;z-index:9999;width:300px;max-height:400px;overflow-y:auto;box-shadow:0 0 10px rgba(0,0,0,0.2);',
  title: 'margin-top:0;margin-bottom:10px;font-size:16px;color:#333;',
  list: 'list-style:none;padding:0;margin:0;',
  item: 'padding:8px 0;font-size:14px;cursor:pointer;',
  itemBorder: 'border-bottom:1px solid #eee;',
  itemHover: '#f0f0f0',
  skuText: 'color:#666',
  closeButton:
    'position:absolute;top:5px;right:8px;background:none;border:none;font-size:18px;cursor:pointer;color:#999;',
};

// src/features/products/stores/webCaptureStore.js
import { create } from 'zustand';

/**
 * Store global pour les données de capture web
 * Permet de conserver l'état entre les navigations dans la WebView
 */
const useWebCaptureStore = create((set, get) => ({
  // État initial
  products: [],
  currentProductIndex: 0,
  isCaptureActive: false,

  // Actions
  setProducts: (products) => set({ products }),
  setCurrentProductIndex: (index) => set({ currentProductIndex: index }),
  setCaptureActive: (active) => set({ isCaptureActive: active }),

  // Mettre à jour un produit spécifique
  updateProductData: (productIndex, data) =>
    set((state) => {
      // Clone pour éviter les références
      const updatedProducts = JSON.parse(JSON.stringify(state.products));

      // Vérifier l'index
      if (!updatedProducts[productIndex]) return { products: updatedProducts };

      // S'assurer que _captured existe
      if (!updatedProducts[productIndex]._captured) {
        updatedProducts[productIndex]._captured = {};
      }

      // Mise à jour explicite de chaque champ
      if (data.title !== undefined) updatedProducts[productIndex]._captured.title = data.title;
      if (data.description !== undefined)
        updatedProducts[productIndex]._captured.description = data.description;
      if (data.selections !== undefined)
        updatedProducts[productIndex]._captured.selections = data.selections;
      if (data.images !== undefined) updatedProducts[productIndex]._captured.images = data.images;

      return { products: updatedProducts };
    }),

  // Mettre à jour un champ spécifique d'un produit
  updateProductField: (productIndex, field, value) =>
    set((state) => {
      // Clone pour éviter les références
      const updatedProducts = JSON.parse(JSON.stringify(state.products));

      // Vérifier l'index
      if (!updatedProducts[productIndex]) return { products: updatedProducts };

      // S'assurer que _captured existe
      if (!updatedProducts[productIndex]._captured) {
        updatedProducts[productIndex]._captured = {};
      }

      // Mise à jour du champ spécifique
      updatedProducts[productIndex]._captured[field] = value;

      return { products: updatedProducts };
    }),

  // Ajouter une image à un produit
  addProductImage: (productIndex, image) =>
    set((state) => {
      // Clone pour éviter les références
      const updatedProducts = JSON.parse(JSON.stringify(state.products));
      const product = updatedProducts[productIndex];

      if (!product) return { products: updatedProducts };

      // S'assurer que _captured existe
      if (!product._captured) {
        product._captured = {};
      }

      // S'assurer que images est un tableau
      if (!Array.isArray(product._captured.images)) {
        product._captured.images = [];
      }

      // Ajouter l'image
      product._captured.images.push(image);

      return { products: updatedProducts };
    }),

  // Supprimer une image d'un produit
  removeProductImage: (productIndex, src) =>
    set((state) => {
      // Clone pour éviter les références
      const updatedProducts = JSON.parse(JSON.stringify(state.products));
      const product = updatedProducts[productIndex];

      if (!product || !product._captured || !Array.isArray(product._captured.images)) {
        return { products: updatedProducts };
      }

      // Filtrer les images
      product._captured.images = product._captured.images.filter((img) => img.src !== src);

      return { products: updatedProducts };
    }),

  // Ajouter ou retirer une sélection de texte
  toggleTextSelection: (productIndex, text, field, added) =>
    set((state) => {
      // Clone pour éviter les références
      const updatedProducts = JSON.parse(JSON.stringify(state.products));
      const product = updatedProducts[productIndex];

      if (!product) return { products: updatedProducts };

      // S'assurer que _captured existe
      if (!product._captured) {
        product._captured = {};
      }

      // S'assurer que selections est un tableau
      if (!Array.isArray(product._captured.selections)) {
        product._captured.selections = [];
      }

      // Récupérer la valeur actuelle du champ
      const fieldValue = product._captured[field] || '';

      // Ajouter ou retirer le texte du champ
      if (added) {
        product._captured[field] = fieldValue ? `${fieldValue}\n\n${text}` : text;

        // Ajouter à la liste des sélections si pas déjà présent
        if (!product._captured.selections.includes(text)) {
          product._captured.selections.push(text);
        }
      } else {
        // Retirer le texte du champ
        product._captured[field] = fieldValue.split(text).join('').trim();

        // Retirer de la liste des sélections
        product._captured.selections = product._captured.selections.filter((s) => s !== text);
      }

      return { products: updatedProducts };
    }),

  // Exporter les données
  getExportData: () => {
    const { products } = get();

    return products.map((p) => {
      // Vérifier la présence des données capturées
      if (!p._captured) {
        // Initialiser si manquant
        p._captured = {
          title: '',
          description: '',
          selections: [],
          images: [],
        };
      }

      // Retourner un nouvel objet pour l'export
      return {
        id: p._id || p.id || null,
        sku: p.sku || null,
        designation: p.designation || null,
        title: p._captured.title || null,
        description: p._captured.description || null,
        selections: Array.isArray(p._captured.selections) ? p._captured.selections : [],
        images: Array.isArray(p._captured.images) ? p._captured.images : [],
      };
    });
  },
}));

export default useWebCaptureStore;

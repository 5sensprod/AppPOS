// src/stores/useReportsStore.js - VERSION SIMPLIFIÉE MAIS AVEC LOGIQUE ORIGINALE
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiService from '../services/api';

const useReportsStore = create(
  devtools(
    (set, get) => ({
      // ===== ÉTAT =====
      categories: null,
      products: null,
      categoryAnalytics: null,
      preCalculatedChartData: null,

      // États de chargement
      loading: {
        categories: false,
        products: false,
      },

      // Erreurs
      errors: {
        categories: null,
        products: null,
      },

      // Métadonnées
      lastUpdate: {
        categories: null,
        products: null,
      },

      // ===== ACTIONS =====

      /**
       * Récupération des catégories
       */
      fetchCategories: async () => {
        const state = get();
        if (state.loading.categories) return state.categories;

        set((state) => ({
          loading: { ...state.loading, categories: true },
          errors: { ...state.errors, categories: null },
        }));

        try {
          const response = await apiService.get('/api/categories');
          const data = response.data?.success ? response.data.data : response.data;

          set((state) => ({
            categories: data,
            loading: { ...state.loading, categories: false },
            lastUpdate: { ...state.lastUpdate, categories: new Date() },
          }));

          return data;
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, categories: false },
            errors: { ...state.errors, categories: error.message },
          }));
          throw error;
        }
      },

      /**
       * Récupération des produits
       */
      fetchProducts: async () => {
        const state = get();
        if (state.loading.products) return state.products;

        set((state) => ({
          loading: { ...state.loading, products: true },
          errors: { ...state.errors, products: null },
        }));

        try {
          const response = await apiService.get('/api/products');
          const data = response.data?.success ? response.data.data : response.data;

          set((state) => ({
            products: data,
            loading: { ...state.loading, products: false },
            lastUpdate: { ...state.lastUpdate, products: new Date() },
          }));

          return data;
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, products: false },
            errors: { ...state.errors, products: error.message },
          }));
          throw error;
        }
      },

      /**
       * Calcul des analytics de catégories (logique métier centralisée)
       */
      calculateCategoryAnalytics: () => {
        const { categories, products } = get();

        if (!categories || !products) {
          return null;
        }

        const rootCategories = {};
        let totalValue = 0;
        let totalProducts = 0;
        let totalMargin = 0;

        // Map des catégories pour navigation rapide
        const categoryMap = {};
        categories.forEach((cat) => {
          categoryMap[cat._id] = cat;
        });

        // Fonction pour trouver la catégorie racine
        const findRootCategory = (categoryId) => {
          if (!categoryId || !categoryMap[categoryId]) return null;

          let current = categoryMap[categoryId];
          while (current.parent_id && categoryMap[current.parent_id]) {
            current = categoryMap[current.parent_id];
          }
          return current;
        };

        // Traiter chaque produit
        products.forEach((product) => {
          const stock = product.stock || 0;
          if (stock <= 0) return; // Seulement les produits en stock

          const purchasePrice = product.purchase_price || 0;
          const salePrice = product.price || 0;

          const productValue = stock * purchasePrice;
          const productMargin = stock * (salePrice - purchasePrice);

          const productCategories = product.categories || [];

          if (productCategories.length > 0) {
            const primaryCategoryId = productCategories[0];
            const rootCategory = findRootCategory(primaryCategoryId);

            if (rootCategory) {
              const rootName = rootCategory.name || 'Sans nom';

              if (!rootCategories[rootName]) {
                rootCategories[rootName] = {
                  id: rootCategory._id,
                  name: rootName,
                  value: 0,
                  products: 0,
                  margin: 0,
                };
              }

              rootCategories[rootName].value += productValue;
              rootCategories[rootName].products += 1;
              rootCategories[rootName].margin += productMargin;
            }
          } else {
            // Produit sans catégorie
            const rootName = 'Sans catégorie';

            if (!rootCategories[rootName]) {
              rootCategories[rootName] = {
                id: null,
                name: rootName,
                value: 0,
                products: 0,
                margin: 0,
              };
            }

            rootCategories[rootName].value += productValue;
            rootCategories[rootName].products += 1;
            rootCategories[rootName].margin += productMargin;
          }

          totalValue += productValue;
          totalProducts += 1;
          totalMargin += productMargin;
        });

        const analytics = {
          rootCategories: Object.values(rootCategories).sort((a, b) => b.value - a.value),
          totals: {
            totalValue,
            totalProducts,
            totalMargin,
          },
          lastCalculated: new Date(),
        };

        set({ categoryAnalytics: analytics });
        return analytics;
      },

      /**
       * Calcul de toutes les données de chart pré-formatées
       */
      calculateAllChartData: () => {
        const { categoryAnalytics } = get();

        if (!categoryAnalytics) {
          return null;
        }

        const { rootCategories, totals } = categoryAnalytics;

        // Pré-calculer les 3 modes en une seule fois
        const allModes = {
          value: [],
          products: [],
          margin: [],
        };

        rootCategories.forEach((cat) => {
          // Mode valeur
          if (cat.value > 0) {
            allModes.value.push({
              name: cat.name,
              value: cat.value,
              formattedValue: `${cat.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
              percentage:
                totals.totalValue > 0 ? ((cat.value / totals.totalValue) * 100).toFixed(1) : 0,
              products: cat.products,
              stockValue: cat.value,
              margin: cat.margin,
            });
          }

          // Mode produits
          if (cat.products > 0) {
            allModes.products.push({
              name: cat.name,
              value: cat.products,
              formattedValue: `${cat.products} produits`,
              percentage:
                totals.totalProducts > 0
                  ? ((cat.products / totals.totalProducts) * 100).toFixed(1)
                  : 0,
              products: cat.products,
              stockValue: cat.value,
              margin: cat.margin,
            });
          }

          // Mode marge
          if (cat.margin > 0) {
            allModes.margin.push({
              name: cat.name,
              value: cat.margin,
              formattedValue: `${cat.margin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
              percentage:
                totals.totalMargin > 0 ? ((cat.margin / totals.totalMargin) * 100).toFixed(1) : 0,
              products: cat.products,
              stockValue: cat.value,
              margin: cat.margin,
            });
          }
        });

        // Trier et limiter chaque mode
        Object.keys(allModes).forEach((mode) => {
          allModes[mode] = allModes[mode].sort((a, b) => b.value - a.value).slice(0, 12);
        });

        // Stocker les données pré-calculées
        set((state) => ({
          ...state,
          preCalculatedChartData: {
            ...allModes,
            totals,
            lastCalculated: new Date(),
          },
        }));

        return allModes;
      },

      /**
       * Getter ultra-rapide pour les données de graphique
       */
      getOptimizedChartData: (mode = 'value') => {
        const { preCalculatedChartData, calculateAllChartData } = get();

        // Si pas de données pré-calculées, les calculer UNE SEULE FOIS
        if (!preCalculatedChartData) {
          calculateAllChartData();
          // Récupérer directement les données fraîchement calculées
          const freshData = get().preCalculatedChartData;
          return {
            chartData: freshData?.[mode] || [],
            totals: freshData?.totals || { totalValue: 0, totalProducts: 0, totalMargin: 0 },
          };
        }

        // Données déjà disponibles, les retourner directement
        return {
          chartData: preCalculatedChartData[mode] || [],
          totals: preCalculatedChartData.totals || {
            totalValue: 0,
            totalProducts: 0,
            totalMargin: 0,
          },
        };
      },

      /**
       * Sélecteurs pour l'état de chargement global
       */
      isLoading: () => {
        const { loading } = get();
        return loading.categories || loading.products;
      },

      hasErrors: () => {
        const { errors } = get();
        return errors.categories || errors.products;
      },

      /**
       * Reset des erreurs
       */
      clearErrors: () => {
        set({
          errors: {
            categories: null,
            products: null,
          },
        });
      },
    }),
    {
      name: 'reports-store',
      partialize: (state) => ({
        categories: state.categories,
        products: state.products,
        categoryAnalytics: state.categoryAnalytics,
        lastUpdate: state.lastUpdate,
      }),
    }
  )
);

export default useReportsStore;

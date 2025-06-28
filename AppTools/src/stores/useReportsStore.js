// src/stores/useReportsStore.js - VERSION HYBRIDE

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import websocketService from '../services/websocketService';
import { useProductDataStore } from '../features/products/stores/productStore';
import { useCategoryDataStore } from '../features/categories/stores/categoryStore';

const useReportsStore = create(
  devtools(
    (set, get) => ({
      // ===== ÉTAT MINIMAL =====
      categoryAnalytics: null,
      preCalculatedChartData: null,
      websocketInitialized: false,
      lastCalculated: null,
      loading: false,
      error: null,

      // ===== GETTERS INTELLIGENTS =====

      /**
       * 📊 Récupère les données depuis les stores existants + les charge si nécessaire
       */
      ensureDataLoaded: async () => {
        const productStore = useProductDataStore.getState();
        const categoryStore = useCategoryDataStore.getState();

        console.log('🔍 [REPORTS] Vérification des données stores...');
        console.log(
          'Products:',
          productStore.products?.length || 0,
          'Categories:',
          categoryStore.categories?.length || 0
        );

        const promises = [];

        // Charger produits si nécessaire
        if (!productStore.products || productStore.products.length === 0) {
          console.log('📦 [REPORTS] Chargement des produits...');
          promises.push(productStore.fetchProducts?.());
        }

        // Charger catégories si nécessaire
        if (!categoryStore.categories || categoryStore.categories.length === 0) {
          console.log('📁 [REPORTS] Chargement des catégories...');
          promises.push(categoryStore.fetchCategories?.());
        }

        if (promises.length > 0) {
          set({ loading: true });
          try {
            await Promise.all(promises);
            console.log('✅ [REPORTS] Données chargées');
          } catch (error) {
            console.error('❌ [REPORTS] Erreur chargement:', error);
            set({ error: error.message });
          } finally {
            set({ loading: false });
          }
        }

        return {
          products: useProductDataStore.getState().products || [],
          categories: useCategoryDataStore.getState().categories || [],
        };
      },

      /**
       * 🧮 Calcul des analytics (simplifié mais robuste)
       */
      calculateCategoryAnalytics: async () => {
        try {
          // S'assurer que les données sont chargées
          const { products, categories } = await get().ensureDataLoaded();

          if (!categories.length || !products.length) {
            console.log('⚠️ [REPORTS] Données insuffisantes après chargement');
            return null;
          }

          console.log(
            `🧮 [REPORTS] Calcul analytics: ${products.length} produits, ${categories.length} catégories`
          );

          const rootCategories = {};
          let totalValue = 0;
          let totalProducts = 0;
          let totalMargin = 0;

          // Map des catégories
          const categoryMap = {};
          categories.forEach((cat) => {
            categoryMap[cat._id] = cat;
          });

          // Trouver catégorie racine
          const findRootCategory = (categoryId) => {
            if (!categoryId || !categoryMap[categoryId]) return null;
            let current = categoryMap[categoryId];
            while (current.parent_id && categoryMap[current.parent_id]) {
              current = categoryMap[current.parent_id];
            }
            return current;
          };

          // Traiter produits en stock
          products.forEach((product) => {
            const stock = product.stock || 0;
            if (stock <= 0 || (product.type && product.type !== 'simple')) return;

            const purchasePrice = product.purchase_price || 0;
            const salePrice = product.price || 0;
            const productValue = stock * purchasePrice;
            const productMargin = stock * (salePrice - purchasePrice);
            const productCategories = product.categories || [];

            let rootName = 'Sans catégorie';
            let rootId = null;

            if (productCategories.length > 0) {
              const rootCategory = findRootCategory(productCategories[0]);
              if (rootCategory) {
                rootName = rootCategory.name || 'Sans nom';
                rootId = rootCategory._id;
              }
            }

            if (!rootCategories[rootName]) {
              rootCategories[rootName] = {
                id: rootId,
                name: rootName,
                value: 0,
                products: 0,
                margin: 0,
              };
            }

            rootCategories[rootName].value += productValue;
            rootCategories[rootName].products += 1;
            rootCategories[rootName].margin += productMargin;

            totalValue += productValue;
            totalProducts += 1;
            totalMargin += productMargin;
          });

          const analytics = {
            rootCategories: Object.values(rootCategories).sort((a, b) => b.value - a.value),
            totals: { totalValue, totalProducts, totalMargin },
            lastCalculated: new Date(),
          };

          set({
            categoryAnalytics: analytics,
            lastCalculated: Date.now(),
            error: null,
          });

          console.log(
            `✅ [REPORTS] Analytics calculées: ${analytics.rootCategories.length} catégories`
          );
          return analytics;
        } catch (error) {
          console.error('❌ [REPORTS] Erreur calcul analytics:', error);
          set({ error: error.message });
          return null;
        }
      },

      /**
       * 🎨 Calcul chart data (inchangé)
       */
      calculateAllChartData: () => {
        const { categoryAnalytics } = get();
        if (!categoryAnalytics) return null;

        const { rootCategories, totals } = categoryAnalytics;
        const allModes = { value: [], products: [], margin: [] };

        rootCategories.forEach((cat) => {
          const baseData = {
            name: cat.name,
            products: cat.products,
            stockValue: cat.value,
            margin: cat.margin,
          };

          // Mode valeur
          if (cat.value > 0) {
            allModes.value.push({
              ...baseData,
              value: cat.value,
              formattedValue: cat.value.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }),
              percentage:
                totals.totalValue > 0 ? ((cat.value / totals.totalValue) * 100).toFixed(1) : 0,
            });
          }

          // Mode produits
          if (cat.products > 0) {
            allModes.products.push({
              ...baseData,
              value: cat.products,
              formattedValue: `${cat.products} produits`,
              percentage:
                totals.totalProducts > 0
                  ? ((cat.products / totals.totalProducts) * 100).toFixed(1)
                  : 0,
            });
          }

          // Mode marge
          if (cat.margin > 0) {
            allModes.margin.push({
              ...baseData,
              value: cat.margin,
              formattedValue: cat.margin.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
              }),
              percentage:
                totals.totalMargin > 0 ? ((cat.margin / totals.totalMargin) * 100).toFixed(1) : 0,
            });
          }
        });

        // Trier et limiter
        Object.keys(allModes).forEach((mode) => {
          allModes[mode] = allModes[mode].sort((a, b) => b.value - a.value).slice(0, 12);
        });

        set({
          preCalculatedChartData: { ...allModes, totals, lastCalculated: new Date() },
          lastCalculated: Date.now(),
        });

        console.log('✅ [REPORTS] Chart data calculées');
        return allModes;
      },

      /**
       * 🚀 Getter optimisé
       */
      getOptimizedChartData: (mode = 'value') => {
        const { preCalculatedChartData } = get();

        if (!preCalculatedChartData) {
          // Déclencher le calcul en arrière-plan
          get()
            .calculateCategoryAnalytics()
            .then(() => {
              get().calculateAllChartData();
            });

          return {
            chartData: [],
            totals: { totalValue: 0, totalProducts: 0, totalMargin: 0 },
          };
        }

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
       * 🔌 WebSocket (inchangé)
       */
      initWebSocketListeners: () => {
        const state = get();
        if (state.websocketInitialized) return;

        console.log('🔌 [REPORTS] Init WebSocket...');

        websocketService.on('category.chart.updated', (eventData) => {
          console.log('📊 [REPORTS] Recalcul depuis serveur');

          if (eventData?.data) {
            set({
              categoryAnalytics: eventData.data,
              preCalculatedChartData: null,
              lastCalculated: Date.now(),
            });
            get().calculateAllChartData();
          }
        });

        set({ websocketInitialized: true });
      },

      // ===== HELPERS =====
      isLoading: () => {
        const state = get();
        return (
          state.loading ||
          useProductDataStore.getState().loading ||
          useCategoryDataStore.getState().loading
        );
      },

      hasErrors: () => {
        const state = get();
        return (
          state.error ||
          useProductDataStore.getState().error ||
          useCategoryDataStore.getState().error
        );
      },

      /**
       * 🔄 Recalcul manuel
       */
      recalculate: async () => {
        console.log('🔄 [REPORTS] Recalcul manuel...');
        await get().calculateCategoryAnalytics();
        get().calculateAllChartData();
      },
    }),
    {
      name: 'reports-store-hybrid',
      partialize: (state) => ({
        categoryAnalytics: state.categoryAnalytics,
        preCalculatedChartData: state.preCalculatedChartData,
        lastCalculated: state.lastCalculated,
      }),
    }
  )
);

export default useReportsStore;

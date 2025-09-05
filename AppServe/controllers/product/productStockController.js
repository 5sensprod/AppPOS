// AppServe/controllers/product/productStockController.js - VERSION PDFKIT

const BaseController = require('../base/BaseController');
const Product = require('../../models/Product');
const productWooCommerceService = require('../../services/ProductWooCommerceService');
const ResponseHandler = require('../../handlers/ResponseHandler');
const exportController = require('../../utils/exportController');

// 🚀 NOUVEAU : Service PDFKit au lieu des templates HTML
const PDFKitService = require('../../services/PDFKitService');

class ProductStockController extends BaseController {
  constructor() {
    super(Product, productWooCommerceService, {
      image: { type: 'gallery' },
      deleteFromWoo: (id) => productWooCommerceService.deleteProduct(id),
    });

    // 🔥 NOUVEAU : Instance du service PDFKit
    this.pdfService = new PDFKitService();
  }

  async updateStock(req, res) {
    // ... méthode inchangée
    try {
      const { id } = req.params;
      const { stock, reason = 'manual_adjustment' } = req.body;

      if (stock === undefined || stock === null) {
        return ResponseHandler.badRequest(res, 'Nouvelle quantité de stock requise');
      }
      if (stock < 0) {
        return ResponseHandler.badRequest(res, 'Le stock ne peut pas être négatif');
      }

      const existing = await this.getByIdOr404(id, res);
      if (!existing) return;

      await this.model.update(id, { stock: parseInt(stock), updated_at: new Date() });
      const updated = await this.model.findById(id);

      return ResponseHandler.success(res, {
        product: updated,
        message: `Stock mis à jour: ${existing.stock} → ${stock}`,
        previous_stock: existing.stock,
        new_stock: stock,
        reason,
      });
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  async getStockStatistics(req, res) {
    // ... méthode inchangée
    try {
      const allProducts = await this.model.findAll();
      const simpleProducts = allProducts.filter((p) => p.type === 'simple');
      const productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);
      const statistics = this.buildStatistics(productsInStock, allProducts, simpleProducts);
      return ResponseHandler.success(res, statistics);
    } catch (error) {
      return ResponseHandler.error(res, error);
    }
  }

  buildStatistics(productsInStock, allProducts, simpleProducts) {
    // ... méthode inchangée (déjà optimale)
    const stats = {
      summary: {
        total_products: allProducts.length,
        simple_products: simpleProducts.length,
        products_in_stock: productsInStock.length,
        excluded_products: simpleProducts.length - productsInStock.length,
      },
      financial: {
        inventory_value: 0,
        retail_value: 0,
        potential_margin: 0,
        margin_percentage: 0,
        tax_amount: 0,
        tax_breakdown: {},
      },
      performance: {
        avg_inventory_per_product: 0,
        avg_retail_per_product: 0,
      },
    };

    if (productsInStock.length === 0) return stats;

    let inventoryValue = 0;
    let retailValue = 0;
    let totalTaxAmount = 0;
    const taxBreakdown = {};

    productsInStock.forEach((product) => {
      const { stock = 0, purchase_price = 0, price = 0, tax_rate = 0 } = product;
      const productInventoryValue = stock * purchase_price;
      const productRetailValue = stock * price;

      inventoryValue += productInventoryValue;
      retailValue += productRetailValue;

      if (!taxBreakdown[tax_rate]) {
        taxBreakdown[tax_rate] = {
          rate: tax_rate,
          product_count: 0,
          inventory_value: 0,
          retail_value: 0,
          tax_amount: 0,
        };
      }

      const breakdown = taxBreakdown[tax_rate];
      breakdown.product_count++;
      breakdown.inventory_value += productInventoryValue;
      breakdown.retail_value += productRetailValue;

      const productTaxAmount =
        tax_rate > 0 ? (productRetailValue * tax_rate) / (100 + tax_rate) : 0;
      breakdown.tax_amount += productTaxAmount;
      totalTaxAmount += productTaxAmount;
    });

    const potentialMargin = retailValue - inventoryValue;
    const marginPercentage = inventoryValue > 0 ? (potentialMargin / inventoryValue) * 100 : 0;

    stats.financial = {
      inventory_value: Math.round(inventoryValue * 100) / 100,
      retail_value: Math.round(retailValue * 100) / 100,
      potential_margin: Math.round(potentialMargin * 100) / 100,
      margin_percentage: Math.round(marginPercentage * 100) / 100,
      tax_amount: Math.round(totalTaxAmount * 100) / 100,
      tax_breakdown: Object.fromEntries(
        Object.entries(taxBreakdown).map(([rate, data]) => [
          `rate_${rate}`,
          {
            rate: parseFloat(rate),
            product_count: data.product_count,
            inventory_value: Math.round(data.inventory_value * 100) / 100,
            retail_value: Math.round(data.retail_value * 100) / 100,
            tax_amount: Math.round(data.tax_amount * 100) / 100,
          },
        ])
      ),
    };

    stats.performance = {
      avg_inventory_per_product: Math.round((inventoryValue / productsInStock.length) * 100) / 100,
      avg_retail_per_product: Math.round((retailValue / productsInStock.length) * 100) / 100,
    };

    return stats;
  }

  sortProducts(products, sortBy, sortOrder) {
    // ... méthode inchangée
    const getSortValue = (product, key) => {
      switch (key) {
        case 'sku':
          return (product.sku || '').toLowerCase();
        case 'stock':
          return product.stock || 0;
        case 'value':
          return (product.stock || 0) * (product.purchase_price || 0);
        default:
          return (product.name || '').toLowerCase();
      }
    };

    return [...products].sort((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);
      const comparison =
        typeof aValue === 'string' ? aValue.localeCompare(bValue) : aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  // 🚀 MÉTHODE ENTIÈREMENT REFACTORISÉE : PDFKit au lieu d'HTML-PDF
  async exportStockStatisticsToPDF(req, res) {
    try {
      console.log('🔄 Génération PDF avec PDFKit...');

      // Extraction des paramètres
      const params = this.extractPDFParams(req.body);

      // 🔥 Support données pré-filtrées (logique hybride conservée)
      const { productsInStock, stockStats } = await this.getOptimizedProductsForPDF(req.body);

      // 🎯 NOUVEAU : Génération avec PDFKit selon le type de rapport
      const pdfOptions = {
        reportType: params.reportType,
        companyInfo: params.companyInfo,
        includeCompanyInfo: params.includeCompanyInfo,
        includeCharts: params.includeCharts,
        orientation: this.getPDFOrientation(params),
        // 🔥 NOUVEAU : Support du rapport détaillé
        productsInStock: productsInStock,
        groupByCategory: params.groupByCategory,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      };

      const pdfBuffer = await this.pdfService.generateStockReport(stockStats, pdfOptions);

      console.log(`✅ PDF ${params.reportType} généré avec succès`);

      // 📤 Envoi de la réponse
      PDFKitService.sendPDFResponse(res, pdfBuffer, params.reportType, params);
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      return ResponseHandler.error(res, {
        message: 'Erreur lors de la génération du PDF',
        details: error.message,
      });
    }
  }

  /**
   * 🖼️ Détermine l'orientation du PDF selon le type et les options
   */
  getPDFOrientation(params) {
    if (params.reportType === 'detailed') {
      return params.isSimplified ? 'portrait' : 'landscape';
    }
    return 'portrait';
  }

  extractPDFParams(body) {
    // ... méthode inchangée
    return {
      companyInfo: body.companyInfo || {},
      reportType: body.reportType || 'summary',
      includeCompanyInfo: body.includeCompanyInfo !== false,
      includeCharts: body.includeCharts !== false,
      sortBy: body.sortBy || 'name',
      sortOrder: body.sortOrder || 'asc',
      groupByCategory: body.groupByCategory || false,
      selectedCategories: body.selectedCategories || [],
      includeUncategorized: body.includeUncategorized !== false,
      isSimplified: body.isSimplified || false,
    };
  }

  // 🚀 NOUVELLE MÉTHODE : Support hybride optimisé avec filtrage catégorie
  async getOptimizedProductsForPDF(body) {
    const { preFilteredData } = body;

    // 🔥 MODE OPTIMISÉ : Utiliser données depuis front-end stores
    if (preFilteredData && preFilteredData.products && preFilteredData.statistics) {
      console.log('🚀 OPTIMISATION: Utilisation données pré-filtrées depuis stores front-end');
      console.log(
        `📊 Produits: ${preFilteredData.products.length}, Source: ${preFilteredData.dataSource}`
      );

      // Validation des données reçues
      if (preFilteredData.products.length === 0) {
        throw new Error('Aucun produit dans les données pré-filtrées');
      }

      return {
        productsInStock: preFilteredData.products,
        stockStats: preFilteredData.statistics,
        dataSource: 'frontend_stores_optimized',
      };
    }

    // 🔄 MODE FALLBACK : Logique backend avec filtrage catégorie
    console.log('📊 FALLBACK: Utilisation logique backend classique');
    return this.getProductsForPDFWithFiltering(body);
  }

  /**
   * 🎯 Récupération des produits avec filtrage par catégorie
   */
  async getProductsForPDFWithFiltering(body) {
    const { selectedCategories = [], includeUncategorized = true, groupByCategory = false } = body;

    console.log('📊 Récupération des produits avec informations de catégories...');
    console.log('🎯 Filtres appliqués:', {
      selectedCategories,
      includeUncategorized,
      groupByCategory,
    });

    // Récupération des produits de base
    const allProducts = await this.model.findAll();

    // 🎯 ENRICHISSEMENT : Ajouter les informations de catégorie pour chaque produit
    const enrichedProducts = await Promise.all(
      allProducts.map(async (product) => {
        try {
          const enrichedProduct = await this.model.findByIdWithCategoryInfo(product._id);
          return enrichedProduct || product;
        } catch (error) {
          console.warn(
            `⚠️ Erreur enrichissement catégorie pour produit ${product._id}:`,
            error.message
          );
          return product;
        }
      })
    );

    console.log(`✅ Enrichissement terminé: ${enrichedProducts.length} produits traités`);

    // Filtrage selon la logique originale
    const simpleProducts = enrichedProducts.filter((p) => p.type === 'simple');
    let productsInStock = simpleProducts.filter((p) => (p.stock || 0) > 0);

    // 🎯 FILTRAGE PAR CATÉGORIE si des catégories sont sélectionnées
    if (selectedCategories && selectedCategories.length > 0) {
      console.log(`🔍 Filtrage par catégories: ${selectedCategories.join(', ')}`);

      productsInStock = productsInStock.filter((product) => {
        // Vérifier si le produit appartient à l'une des catégories sélectionnées
        if (product.category_info && product.category_info.primary) {
          const primaryCategoryId = product.category_info.primary.id;
          const primaryCategoryName = product.category_info.primary.name;

          // Vérifier par ID ou par nom de catégorie
          const matchesSelection =
            selectedCategories.includes(primaryCategoryId) ||
            selectedCategories.includes(primaryCategoryName);

          if (matchesSelection) {
            return true;
          }

          // Vérifier aussi dans les refs si pas de match avec primary
          if (product.category_info.refs) {
            return product.category_info.refs.some(
              (ref) => selectedCategories.includes(ref.id) || selectedCategories.includes(ref.name)
            );
          }
        }

        // Si includeUncategorized est true et que le produit n'a pas de catégorie
        return includeUncategorized && (!product.category_info || !product.category_info.primary);
      });

      console.log(
        `📋 Produits après filtrage: ${productsInStock.length} sur ${simpleProducts.filter((p) => (p.stock || 0) > 0).length}`
      );
    }

    if (productsInStock.length === 0) {
      throw new Error('Aucun produit en stock à exporter avec les filtres appliqués');
    }

    const stockStats = this.buildStatistics(productsInStock, enrichedProducts, simpleProducts);
    return { productsInStock, stockStats };
  }

  // 🗑️ MÉTHODES SUPPRIMÉES : Plus besoin avec PDFKit
  // - generateHTMLContent()
  // - generatePDFBuffer()
  // - sendPDFResponse() -> déplacée dans PDFKitService

  // ✅ CONSERVATION de sendPDFResponse pour compatibilité
  sendPDFResponse(res, pdfBuffer, reportType, params) {
    PDFKitService.sendPDFResponse(res, pdfBuffer, reportType, params);
  }
}

const productStockController = new ProductStockController();

module.exports = exportController(productStockController, [
  'updateStock',
  'getStockStatistics',
  'exportStockStatisticsToPDF',
]);

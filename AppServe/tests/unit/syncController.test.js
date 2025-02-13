// AppServe\tests\unit\syncController.test.js
const woocommerceService = require('../../services/woocommerceService');
const syncController = require('../../controllers/syncController');
const Category = require('@models/Category');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

jest.mock('@models/Category');
jest.mock('../../services/woocommerceService');
jest.mock('@woocommerce/woocommerce-rest-api', () => ({
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    url: process.env.WC_URL || 'http://localhost',
  })),
}));

describe('syncController', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      params: { id: '123' },
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('syncSingleCategory', () => {
    it("devrait échouer si la catégorie n'existe pas", async () => {
      Category.findById.mockResolvedValue(null);

      await syncController.syncSingleCategory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Catégorie non trouvée',
      });
    });

    it('devrait synchroniser avec succès', async () => {
      const mockCategory = { _id: '123', name: 'Test' };
      const mockResults = { created: 1, updated: 2 };

      Category.findById.mockResolvedValue(mockCategory);
      woocommerceService.syncToWooCommerce.mockResolvedValue(mockResults);

      await syncController.syncSingleCategory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        timestamp: expect.any(Date),
        results: mockResults,
        summary: '1 créées, 2 mises à jour',
      });
    });
  });

  describe('syncCategories', () => {
    it('devrait synchroniser dans les deux sens par défaut', async () => {
      const mockResults = {
        from_wc: { created: 1, updated: 1 },
        to_wc: { created: 2, updated: 2, deleted: 1 },
      };

      woocommerceService.syncFromWooCommerce.mockResolvedValue(mockResults.from_wc);
      woocommerceService.syncToWooCommerce.mockResolvedValue(mockResults.to_wc);

      await syncController.syncCategories(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        timestamp: expect.any(Date),
        results: mockResults,
        summary: {
          from_wc: '1 créées, 1 mises à jour',
          to_wc: '2 créées, 2 mises à jour, 1 supprimées',
        },
      });
    });
  });
});

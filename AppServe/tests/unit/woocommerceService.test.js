// AppServe\tests\unit\woocommerceService.test.js
require('dotenv').config();
const woocommerceService = require('../../services/woocommerceService');
const Category = require('@models/Category');
const WooCommerceRestApi = require('@woocommerce/woocommerce-rest-api').default;

jest.mock('@models/Category');
jest.mock('@woocommerce/woocommerce-rest-api', () => ({
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('woocommerceService.deleteCategory', () => {
  let mockWooApi;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWooApi = new WooCommerceRestApi();
    Category.delete = jest.fn().mockResolvedValue(true);
  });

  it("devrait empêcher la suppression de la catégorie 'non-classe'", async () => {
    Category.findById.mockResolvedValue({ id: 1, slug: 'non-classe' });
    await expect(woocommerceService.deleteCategory(1)).rejects.toThrow(
      'Impossible de supprimer la catégorie par défaut WooCommerce.'
    );
  });

  it('devrait supprimer une catégorie normale', async () => {
    Category.findById.mockResolvedValue({ id: 2, slug: 'electronics', woo_id: 123 });
    mockWooApi.delete.mockResolvedValue({});
    const result = await woocommerceService.deleteCategory(2);
    expect(result).toEqual({ success: true });
  });

  it("devrait renvoyer une erreur si la catégorie n'existe pas", async () => {
    Category.findById.mockResolvedValue(null);
    await expect(woocommerceService.deleteCategory(999)).rejects.toThrow('Category not found');
  });
});

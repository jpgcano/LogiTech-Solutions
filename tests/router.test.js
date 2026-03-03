const request = require('supertest');
const appObj = require('../src/app.js').default;
const ProductService = require('../src/services/ProductService.js').default;
const SuppliersService = require('../src/services/SuppliersService.js').default;

// mock external services so tests don't need a real database
jest.mock('../src/services/ProductService.js');
jest.mock('../src/services/SuppliersService.js');

describe('API routes validation & basic behavior', () => {
    it('rejects creating a product with invalid payload', async () => {
        const res = await request(appObj.server)
            .post('/api/Products')
            .send({ sku: '', name: 'foo' });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });

    it('returns 404 when deleting a non-existent product', async () => {
        ProductService.deleteProductBySku.mockResolvedValue(null);
        const res = await request(appObj.server)
            .delete('/api/Products/nonexistent');
        expect(res.status).toBe(404);
        expect(res.body.ok).toBe(false);
    });

    it('rejects creating a supplier with missing fields', async () => {
        const res = await request(appObj.server)
            .post('/api/Suppliers')
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });
});

import postgresDB from '../config/postgres.js';
import AuditService from './AuditService.js';

class ProductService {
    constructor() {
        this.db = postgresDB;
    }

    // Get all products
    async getProducts() {
        const res = await this.db.query('SELECT p.*, c.category_name FROM product p LEFT JOIN category c ON p.product_category = c.category_id');
        return res.rows;
    }

    // Get product by SKU
    async getProductBySku(sku) {
        const res = await this.db.query('SELECT p.*, c.category_name FROM product p LEFT JOIN category c ON p.product_category = c.category_id WHERE p.product_sku = $1', [sku]);
        return res.rows.length ? res.rows[0] : null;
    }

    // Create product
    async createProduct(sku, name, categoryId, unitPrice) {
        const res = await this.db.query('INSERT INTO product (product_sku, product_name, product_category, unit_price) VALUES ($1, $2, $3, $4) RETURNING *', [sku, name, categoryId, unitPrice]);
        return res.rows[0];
    }

    // Update product by SKU
    async updateProductBySku(sku, data) {
        const existing = await this.getProductBySku(sku);
        if (!existing) return null;

        const { name, categoryId, unitPrice } = data;
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`product_name = $${paramCount++}`);
            values.push(name);
        }
        if (categoryId !== undefined) {
            updateFields.push(`product_category = $${paramCount++}`);
            values.push(categoryId);
        }
        if (unitPrice !== undefined) {
            updateFields.push(`unit_price = $${paramCount++}`);
            values.push(unitPrice);
        }

        if (updateFields.length === 0) return existing;

        values.push(sku);
        const query = `UPDATE product SET ${updateFields.join(', ')} WHERE product_sku = $${paramCount} RETURNING *`;
        const res = await this.db.query(query, values);
        return res.rows[0];
    }

    // Delete product by SKU
    async deleteProductBySku(sku, performedBy = 'system') {
        const existing = await this.getProductBySku(sku);
        if (!existing) return null;

        await this.db.query('DELETE FROM product WHERE product_sku = $1', [sku]);
        await AuditService.logDeletion('Product', sku, existing, performedBy);
        return existing;
    }

    // BI: Top suppliers by items sold and total inventory value (via view)
    async getSuppliersSummary() {
        // the view `suppliers_inventory_summary_view` encapsulates the aggregation
        const res = await this.db.query('SELECT * FROM suppliers_inventory_summary_view ORDER BY total_inventory_value DESC');
        return res.rows;
    }

    // BI: Top products by sales in a specific category (via view)
    async getTopProductsByCategory(category) {
        // uses the view `products_revenue_by_category_view` which already pre-aggregates
        const query = `
            SELECT *
            FROM products_revenue_by_category_view
            WHERE category_name = $1
            ORDER BY total_revenue DESC
        `;
        const res = await this.db.query(query, [category]);
        return res.rows;
    }
}

export default new ProductService();

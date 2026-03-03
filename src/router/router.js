import { Router } from "express";
import MigrationService from "../services/MigrationService.js";
import SuppliersService from "../services/SuppliersService.js";
import ProductService from "../services/ProductService.js";
import SalesService from "../services/salesServices.js";
import AuditService from "../services/AuditService.js";
import postgresDB from "../config/postgres.js";
import { z } from 'zod';

// validation schemas
const supplierSchema = z.object({
    supplier_email: z.string().email(),
    supplier_name: z.string().min(1),
});

const productSchema = z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    categoryId: z.number().int(),
    unitPrice: z.number().nonnegative(),
});

const productUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    categoryId: z.number().int().optional(),
    unitPrice: z.number().nonnegative().optional(),
});

const router = Router();

router.post('/migrate', async (req, res) => {try {
        // Le pasamos "true" para que limpie la BD antes de insertar y puedas probar varias veces
        const result = await MigrationService.migrate(true); 
        res.status(200).json(result);
    } catch (error) {
        console.error("Error en el endpoint de migración:", error);
        res.status(500).json({ 
            ok: false, 
            error: "Hubo un error al ejecutar la migración",
            detalle: error.message 
        });
    }
});

 router.get('/Suppliers', async (req, res) => {
    try {
        const suppliers = await SuppliersService.getSuppliers();
        res.status(200).json(suppliers);
    } catch (error) {
        console.error("Error al obtener proveedores:", error);
        res.status(500).json({
            ok: false,
            error: "Hubo un error al obtener los proveedores",
            detalle: error.message
        });
    }
});

router.post('/Suppliers', async (req, res) => {
    try {
        const parse = supplierSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ ok: false, error: parse.error.errors });
        }
        const result = await SuppliersService.addSupplier(parse.data);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.put('/Suppliers/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const parse = supplierSchema.partial().safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ ok: false, error: parse.error.errors });
        }
        const updated = await SuppliersService.updateSupplierByEmail(email, parse.data);
        if (!updated) return res.status(404).json({ ok: false, error: 'Supplier not found' });
        await AuditService.logUpdate('Supplier', email, { before: null, after: parse.data }, req.user?.email || 'system');
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.delete('/Suppliers/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const existing = await SuppliersService.getSupplierByEmail(email);
        if (!existing) return res.status(404).json({ ok: false, error: 'Supplier not found' });
        const deleted = await SuppliersService.deleteSupplierByEmail(email, req.user?.email || 'system');
        await AuditService.logDeletion('Supplier', email, deleted, req.user?.email || 'system');
        res.status(200).json({ ok: true, deleted });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ========== PRODUCTS CRUD ==========

router.get('/Products', async (req, res) => {
    try {
        const products = await ProductService.getProducts();
        res.status(200).json(products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.get('/Products/:sku', async (req, res) => {
    try {
        const sku = req.params.sku;
        const product = await ProductService.getProductBySku(sku);
        if (!product) return res.status(404).json({ ok: false, error: 'Product not found' });
        res.status(200).json(product);
    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.post('/Products', async (req, res) => {
    try {
        const parse = productSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ ok: false, error: parse.error.errors });
        }
        const { sku, name, categoryId, unitPrice } = parse.data;
        const product = await ProductService.createProduct(sku, name, categoryId, unitPrice);
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.put('/Products/:sku', async (req, res) => {
    try {
        const sku = req.params.sku;
        const parse = productUpdateSchema.safeParse(req.body);
        if (!parse.success) {
            return res.status(400).json({ ok: false, error: parse.error.errors });
        }
        const updated = await ProductService.updateProductBySku(sku, parse.data);
        if (!updated) return res.status(404).json({ ok: false, error: 'Product not found' });
        await AuditService.logUpdate('Product', sku, parse.data, req.user?.email || 'system');
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

router.delete('/Products/:sku', async (req, res) => {
    try {
        const sku = req.params.sku;
        const deleted = await ProductService.deleteProductBySku(sku, req.user?.email || 'system');
        if (!deleted) return res.status(404).json({ ok: false, error: 'Product not found' });
        res.status(200).json({ ok: true, deleted });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ========== BUSINESS INTELLIGENCE ENDPOINTS ==========

// BI 1: Suppliers summary (total items supplied, total inventory value)
router.get('/bi/suppliers-summary', async (req, res) => {
    try {
        const suppliers = await ProductService.getSuppliersSummary();
        res.status(200).json(suppliers);
    } catch (error) {
        console.error('Error getting suppliers summary:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// BI 2: Customer purchase history
router.get('/bi/customer-history/:email', async (req, res) => {
    try {
        const email = req.params.email;
        // Get from MongoDB Sales collection
        const history = await SalesService.getFullReport(email);
        if (!history) {
            return res.status(404).json({ ok: false, error: 'Customer not found' });
        }
        
        // Calculate totals by transaction
        const transactions = {};
        if (history.product_name && Array.isArray(history.product_name)) {
            history.product_name.forEach(product => {
                const txn = product.transaction_id;
                if (!transactions[txn]) {
                    transactions[txn] = { 
                        transaction_id: txn,
                        date: product.date,
                        products: [],
                        total: 0
                    };
                }
                transactions[txn].products.push({
                    product_sku: product.product_sku,
                    product_name: product.product_name,
                    quantity: product.quantity,
                    unit_price: product.unit_price,
                    line_total: product.total_line_value
                });
                transactions[txn].total += product.total_line_value;
            });
        }

        res.status(200).json({
            ok: true,
            customer_name: history.customer_name,
            customer_email: history.customer_email,
            transactions: Object.values(transactions),
            total_spent: Object.values(transactions).reduce((sum, t) => sum + t.total, 0)
        });
    } catch (error) {
        console.error('Error getting customer history:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// BI 3: Top products by category (ordered by revenue generated)
router.get('/bi/top-products-by-category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const products = await ProductService.getTopProductsByCategory(category);
        res.status(200).json(products || []);
    } catch (error) {
        console.error('Error getting top products by category:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});


export default router;
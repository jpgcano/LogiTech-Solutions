import SalesModel from '../model/sales.js';
import postgresDB from '../config/postgres.js';
import { v4 as uuidv4 } from 'uuid';

class SalesService {
    constructor() {
        this.storage = SalesModel;
        this.db = postgresDB;
    }

    // Create a new sale with multiple products - uses SQL transaction
    async createSale(data) {
        const { customer_email, products } = data;

        if (!customer_email || !products || !Array.isArray(products) || products.length === 0) {
            throw new Error('Invalid sale data: customer_email and products array required');
        }

        // Generate unique transaction ID
        const transactionId = uuidv4();
        const today = new Date().toISOString().split('T')[0];

        const client = await this.db.getClient();
        try {
            // BEGIN TRANSACTION
            await client.query('BEGIN');

            // Get customer ID by email
            const customerRes = await client.query(
                'SELECT customer_id FROM customer WHERE LOWER(customer_email) = LOWER($1)',
                [customer_email]
            );

            if (customerRes.rows.length === 0) {
                throw new Error(`Customer with email "${customer_email}" not found`);
            }

            const customerId = customerRes.rows[0].customer_id;

            // Calculate total
            let totalAmount = 0;
            const productDetails = [];

            for (const product of products) {
                const { sku, quantity } = product;

                // Validate product exists
                const prodRes = await client.query(
                    'SELECT p.unit_price FROM product p WHERE p.product_sku = $1',
                    [sku]
                );

                if (prodRes.rows.length === 0) {
                    throw new Error(`Product with SKU "${sku}" not found`);
                }

                const unitPrice = parseFloat(prodRes.rows[0].unit_price);
                const lineTotal = unitPrice * quantity;
                totalAmount += lineTotal;

                productDetails.push({
                    sku,
                    quantity,
                    unitPrice,
                    lineTotal
                });
            }

            // Insert sale
            await client.query(
                'INSERT INTO sale (transaction_id, datesale, customer, total) VALUES ($1, $2, $3, $4)',
                [transactionId, today, customerId, totalAmount]
            );

            // Insert sale items
            for (const productDetail of productDetails) {
                await client.query(
                    'INSERT INTO sale_product (sale, product_sku, amount, sub_total) VALUES ($1, $2, $3, $4)',
                    [transactionId, productDetail.sku, productDetail.quantity, productDetail.lineTotal]
                );
            }

            // COMMIT TRANSACTION
            await client.query('COMMIT');

            console.log(`[SALE] ✓ Transacción exitosa: ${transactionId} para ${customer_email}`);

            // Synchronize to MongoDB after successful transaction (resilient - errors don't fail the response)
            const syncResult = await this.synchronizeHistories(customer_email);
            console.log(`[SALE] Resultado de sincronización:`, syncResult);

            return {
                ok: true,
                transaction_id: transactionId,
                customer_email,
                total: totalAmount,
                items_count: products.length,
                date: today,
                mongodb_sync: syncResult
            };
        } catch (error) {
            try {
                await client.query('ROLLBACK');
                console.error(`[SALE] ROLLBACK ejecutado para transacción fallida:`, error.message);
            } catch (rollbackError) {
                console.error(`[CRITICAL] Error durante ROLLBACK:`, rollbackError);
            }
            
            // Enrich error with context
            const enrichedError = new Error(
                `Sale creation failed: ${error.message}. ${error.code === '23505' ? 'Duplicate record.' : ''}`
            );
            enrichedError.code = error.code;
            enrichedError.detail = error.detail;
            
            throw enrichedError;
        } finally {
            client.release();
        }
    }

    // Synchronize customer history to MongoDB with error resilience
    async synchronizeHistories(customerEmail) {
        try {
            console.log(`[SYNC] Iniciando sincronización de historial: ${customerEmail}`);

            // Fetch complete sales history from PostgreSQL
            const saleHistory = await this.db.query(`
                SELECT 
                    c.customer_id,
                    c.customer_email,
                    c.customer_name,
                    s.transaction_id,
                    s.datesale as date,
                    p.product_sku,
                    p.product_name,
                    p.product_category,
                    sp.amount as quantity,
                    p.unit_price,
                    sp.sub_total as total_line_value,
                    sup.supplier_name,
                    sup.supplier_email
                FROM customer c
                LEFT JOIN sale s ON c.customer_id = s.customer
                LEFT JOIN sale_product sp ON s.transaction_id = sp.sale
                LEFT JOIN product p ON sp.product_sku = p.product_sku
                LEFT JOIN product_supplier ps ON p.product_sku = ps.product_sku
                LEFT JOIN supplier sup ON ps.supplier_id = sup.supplier_id
                WHERE LOWER(c.customer_email) = LOWER($1)
                ORDER BY s.datesale DESC
            `, [customerEmail]);

            if (saleHistory.rows.length === 0) {
                console.log(`[SYNC] Sin historial de ventas encontrado para ${customerEmail}`);
                return { ok: true, synced: false, reason: 'no_sales' };
            }

            const firstRow = saleHistory.rows[0];
            const document = {
                customer_email: firstRow.customer_email,
                customer_name: firstRow.customer_name,
                last_synced: new Date().toISOString(),
                product_history: saleHistory.rows.filter(row => row.product_sku).map(row => ({
                    transaction_id: row.transaction_id,
                    date: row.date,
                    product_sku: row.product_sku,
                    product_name: row.product_name,
                    product_category: row.product_category,
                    quantity: row.quantity,
                    unit_price: parseFloat(row.unit_price),
                    total_line_value: parseFloat(row.total_line_value),
                    supplier_name: row.supplier_name,
                    supplier_email: row.supplier_email
                }))
            };

            // Try to sync with MongoDB with retry logic
            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    const result = await this.storage.model.updateOne(
                        { customer_email: customerEmail },
                        { $set: document },
                        { upsert: true }
                    );

                    console.log(`[SYNC] ✓ Sincronización exitosa para ${customerEmail}`, result);
                    return { ok: true, synced: true, mongodb_result: result };
                } catch (mongoError) {
                    lastError = mongoError;
                    retries--;
                    if (retries > 0) {
                        console.warn(`[SYNC] Reintentando sincronización (${retries} intentos restantes)...`, mongoError.message);
                        await new Promise(resolve => setTimeout(resolve, 500)); // wait 500ms
                    }
                }
            }

            // MongoDB sync failed after retries - log critical error but don't throw
            console.error(`[CRITICAL] MongoDB sync failed for ${customerEmail} after 3 retries:`, lastError);
            
            // Log to audit that sync failed - important for debugging in production
            console.error(`[AUDIT] SYNC_FAILURE: customer=${customerEmail}, error=${lastError.message}`);
            
            return { 
                ok: true, 
                synced: false, 
                reason: 'mongodb_unavailable',
                error: lastError.message,
                note: 'Sale was committed to PostgreSQL but MongoDB sync failed'
            };

        } catch (error) {
            console.error('[CRITICAL] Fatal error in synchronizeHistories:', error);
            // Don't throw - this is after COMMIT so we can't rollback
            return { 
                ok: true, 
                synced: false, 
                reason: 'fatal_error',
                error: error.message 
            };
        }
    }

    // Get all sales
    async getSales() {
        const res = await this.db.query(`
            SELECT 
                s.transaction_id,
                c.customer_email,
                c.customer_name,
                s.datesale,
                s.total,
                COUNT(sp.product_sku) as items_count
            FROM sale s
            JOIN customer c ON s.customer = c.customer_id
            LEFT JOIN sale_product sp ON s.transaction_id = sp.sale
            GROUP BY s.transaction_id, c.customer_email, c.customer_name, s.datesale, s.total
            ORDER BY s.datesale DESC
        `);
        return res.rows;
    }

    // Get sale detail
    async getSaleById(transactionId) {
        const res = await this.db.query(`
            SELECT 
                s.transaction_id,
                c.customer_email,
                c.customer_name,
                s.datesale,
                s.total,
                sp.product_sku,
                p.product_name,
                sp.amount as quantity,
                p.unit_price,
                sp.sub_total
            FROM sale s
            JOIN customer c ON s.customer = c.customer_id
            LEFT JOIN sale_product sp ON s.transaction_id = sp.sale
            LEFT JOIN product p ON sp.product_sku = p.product_sku
            WHERE s.transaction_id = $1
            ORDER BY sp.product_sku
        `, [transactionId]);
        return res.rows;
    }

    // Get customer sales history from MongoDB
    async getFullReport(email) {
        const history = await this.storage.findByEmail(email);
        if (!history) return null;
        return history;
    }
}

export default new SalesService();
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import postgresDB from '../config/postgres.js';
import { env } from '../config/env.js';
import SalesService from '../services/salesServices.js';

class MigrationService {
    constructor() {
        this.db = postgresDB;
    }

    // helper para buscar o insertar en tablas simples (ciudad, categoría, proveedor, etc.)
    async getOrCreateEntity(tableName, keyColumn, keyValue, map, additionalData = {}) {
        if (map.has(keyValue)) {
            return map.get(keyValue);
        }

        const res = await this.db.query(
            `SELECT * FROM ${tableName} WHERE ${keyColumn} = $1`,
            [keyValue]
        );

        if (res.rows.length) {
            const row = res.rows[0];
            const id = row[`${tableName}_id`] || row[`${tableName}_Id`];
            map.set(keyValue, id);
            return id;
        }

        // construir la sentencia INSERT con columnas adicionales si las hay
        const cols = [keyColumn, ...Object.keys(additionalData)];
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const vals = [keyValue, ...Object.values(additionalData)];

        const ins = await this.db.query(
            `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
            vals
        );
        const newId = ins.rows[0][`${tableName}_id`] || ins.rows[0][`${tableName}_Id`];
        map.set(keyValue, newId);
        return newId;
    }

    async migrate(clearBefore = false) {
        try {
            console.log("Iniciando migración de datos...");
            const csvPath = resolve(env.file_data_csv);
            const fileContent = await readFile(csvPath, 'utf-8');

            const rows = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                skip_records_with_error: true
            });

            if (clearBefore) {
                await this.clearDatabase();
            }

            await this.processAndInsert(rows);
            return { ok: true, message: "Migración completada con éxito." };
        } catch (error) {
            console.error("Error migrando datos:", error);
            throw error;
        }
    }

    async clearDatabase() {
        console.log('Limpiando datos anteriores...');
        await this.db.query('BEGIN');
        await this.db.query(`TRUNCATE TABLE city, supplier, category, product, product_supplier, customer, sale, sale_product CASCADE`);
        await this.db.query('COMMIT');
        console.log('Datos anteriores eliminados correctamente');
    }

    // 2. Método para transformar los datos a formato NoSQL (Encapsulamiento)
    parseRowsToMongoFormat(rows) {
        // Group products by customer_email to match SalesModel
        const map = new Map();
        for (const row of rows) {
            const email = row.customer_email;
            if (!map.has(email)) {
                map.set(email, {
                    customer_email: email,
                    customer_name: row.customer_name,
                    product_name: []
                });
            }
            map.get(email).product_name.push({
                transaction_id: row.transaction_id,
                date: row.date,
                product_sku: row.product_sku,
                product_name: row.product_name,
                product_category: row.product_category,
                quantity: parseInt(row.quantity, 10),
                unit_price: parseFloat(row.unit_price),
                total_line_value: parseFloat(row.total_line_value),
                supplier_name: row.supplier_name,
                supplier_email: row.supplier_email,
            });
        }
        return Array.from(map.values());
    }

    async processAndInsert(rows) {
        const categoryMap = new Map();
        const supplierMap = new Map();
        const cityMap = new Map();
        const productMap = new Map();
        const customerMap = new Map();

        console.log(" Insertando entidades únicas en PostgreSQL...");
        try {
            await this.db.query('BEGIN');

            for (const row of rows) {
                // normalize fields
                const transactionId = row.transaction_id;
                const date = row.date;
                const customerName = row.customer_name;
                const customerEmail = row.customer_email;
                const customerAddress = row.customer_address;
                const customerPhone = row.customer_phone;
                const productCategory = row.product_category;
                const productSku = row.product_sku;
                const productName = row.product_name;
                const unitPrice = parseFloat(row.unit_price);
                const quantity = parseInt(row.quantity, 10);
                const totalLineValue = parseFloat(row.total_line_value);
                const supplierName = row.supplier_name;
                const supplierEmail = row.supplier_email;

                // city: take last token as city name (simple heuristic)
                const cityName = (customerAddress || '').split(' ').slice(-1)[0] || 'Unknown';

                // category
                const categoryId = await this.getOrCreateEntity(
                    'category',
                    'category_name',
                    productCategory,
                    categoryMap
                );

                // supplier (uses both email and name)
                const supplierId = await this.getOrCreateEntity(
                    'supplier',
                    'supplier_email',
                    supplierEmail,
                    supplierMap,
                    { supplier_name: supplierName }
                );

                // city
                const cityId = await this.getOrCreateEntity(
                    'city',
                    'specialty',
                    cityName,
                    cityMap
                );

                // customer
                if (!customerMap.has(customerEmail)) {
                    const res = await this.db.query('SELECT customer_id FROM customer WHERE customer_email = $1', [customerEmail]);
                    if (res.rows.length) {
                        customerMap.set(customerEmail, res.rows[0].customer_id);
                    } else {
                        const ins = await this.db.query('INSERT INTO customer (customer_name, customer_email, customer_phone, customer_address, city) VALUES ($1,$2,$3,$4,$5) RETURNING customer_id', [customerName, customerEmail, customerPhone, customerAddress, cityId]);
                        customerMap.set(customerEmail, ins.rows[0].customer_id);
                    }
                }
                const customerId = customerMap.get(customerEmail);

                // product
                if (!productMap.has(productSku)) {
                    const res = await this.db.query('SELECT product_sku FROM product WHERE product_sku = $1', [productSku]);
                    if (res.rows.length) {
                        productMap.set(productSku, productSku);
                    } else {
                        await this.db.query('INSERT INTO product (product_sku, product_name, product_category, unit_price) VALUES ($1,$2,$3,$4)', [productSku, productName, categoryId, unitPrice]);
                        productMap.set(productSku, productSku);
                    }
                }

                // product_supplier: ensure a relation exists
                const psRes = await this.db.query('SELECT id FROM product_supplier WHERE product_sku = $1 AND supplier_id = $2', [productSku, supplierId]);
                if (!psRes.rows.length) {
                    await this.db.query('INSERT INTO product_supplier (product_sku, supplier_id, quantity, total_line_value) VALUES ($1,$2,$3,$4)', [productSku, supplierId, quantity, totalLineValue]);
                }

                // ensure sale row exists (insert placeholder if missing) to satisfy FK
                const saleExists = await this.db.query('SELECT transaction_id FROM sale WHERE transaction_id = $1', [transactionId]);
                if (!saleExists.rows.length) {
                    await this.db.query('INSERT INTO sale (transaction_id, datesale, customer, total) VALUES ($1, $2, $3, $4)', [transactionId, date, customerId, 0]);
                }

                // insert sale_product row (FK now satisfecho)
                await this.db.query('INSERT INTO sale_product (sale, product_sku, amount, sub_total) VALUES ($1,$2,$3,$4)', [transactionId, productSku, quantity, totalLineValue]);
            }

            await this.db.query('COMMIT');

            // 3. Sincronización con NoSQL
            const dataForMongo = this.parseRowsToMongoFormat(rows);
            await SalesService.synchronizeHistories(dataForMongo);

            console.log("Datos guardados correctamente en SQL y NoSQL.");
        } catch (error) {
            await this.db.query('ROLLBACK');
            console.error("Ocurrió un error en la inserción:", error);
            throw error;
        }
    }


}

export default new MigrationService();
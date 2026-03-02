import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';
import postgresDB from '../config/postgres.js';
import { env } from '../config/env.js';
import patientService from '../services/PatientService.js';

class MigrationService {
    constructor() {
        this.db = postgresDB;
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
        await this.db.query(`TRUNCATE TABLE city, supplier, category, product, customer, sale, sale_procuct CASCADE`);
        await this.db.query('COMMIT');
        console.log('Datos anteriores eliminados correctamente');
    }

    // 2. Método para transformar los datos a formato NoSQL (Encapsulamiento)
    parseRowsToMongoFormat(rows) {
        // const histories = new Map();
        // for (const row of rows) {
        //     if (!histories.has(row.patient_email)) {
        //         histories.set(row.patient_email, {
        //             patientEmail: row.patient_email,
        //             patientName: row.patient_name,
        //             appointments: []
        //         });
        //     }
        //     histories.get(row.patient_email).appointments.push({
        //         appointmentId: row.appointment_id,
        //         date: row.appointment_date,
        //         doctorName: row.doctor_name,
        //         doctorEmail: row.doctor_email,
        //         specialty: row.specialty,
        //         treatmentCode: row.treatment_code,
        //         treatmentDescription: row.treatment_description,
        //         treatmentCost: parseFloat(row.treatment_cost),
        //         insuranceProvider: row.insurance_provider,
        //         coveragePercentage: parseInt(row.coverage_percentage),
        //         amountPaid: parseFloat(row.amount_paid)
        //     });
        // }
        return Array.from(histories.values());
    }

    async processAndInsert(rows) {
        const city = new Map();
        const supplier = new Map();
        const category = new Map();
        const product = new Map();
        const product_supplier = new Map();
        const customer = new Map();
        const sale = new Map();
        const sale_product = new Map();
        let cityIdCounter = 1;
        let supIdCounter = 1;
        let catIdCounter = 1;
        let proIdCounter = 1;
        let custIdCounter = 1;
        let saleIdCounter = 1;

        for (const row of rows) {
            // city
            if (!city.has(row.customer_address)) {
                city.set(row.customer_address, {
                    id: cityIdCounter++,
                    name: row.city[1] // separar los datos de addres y ciudad y quedarnos solo con el nombre de la ciudad, para no tener datos repetidos en la tabla cit
                });
            }
            const currentCityId = city.get(row.customer_address).id;

            // supplier
            if (!supplier.has(row.supplier)) {
                supplier.set(row.supplier, {
                    id: supIdCounter++,
                    name: row.supplier_name,
                    email: row.supplier_email
                });
            }
            const currentSupplierId = supplier.get(row.supplier).id;

            // category
            if (!category.has(row.category)) {
                category.set(row.category, {
                    id: catIdCounter++,
                    name: row.product_category
                });
            }
            const currentCategoryId = category.get(row.category).id;

            // product
            if (!product.has(row.product_name)) {
                product.set(row.product_name, {
                    id: row.product_sku,
                    name: row.product_name,
                    category_id: currentCategoryId,
                    unit_price: row.unit_price
                });
            }
            const currentProductId = product.get(row.product_name).id;

            // product_supplier
            if (!product_supplier.has(`${currentProductId}-${currentSupplierId}`)) {
                product_supplier.set(`${currentProductId}-${currentSupplierId}`, {
                    product_id: currentProductId,
                    supplier_id: currentSupplierId
                });
            }

            // customer
            if (!customer.has(row.customer_email)) {
                customer.set(row.customer_email, {
                    id: custIdCounter++,
                    name: row.customer_name,
                    email: row.customer_email,
                    phone: row.customer_phone   ,
                    address: row.customer_address[0] // separar los datos de addres y ciudad y quedarnos solo con la dirección, para no tener datos repetidos en la tabla customer
                });
            }
            const currentCustomerId = customer.get(row.customer_email).id;

            // sale
            if (!sale.has(row.sale_id)) {
                sale.set(row.sale_id, {
                    id: `SALE-${String(saleIdCounter++).padStart(3, '0')}`,
                    customer_id: currentCustomerId,
                    insurance_id: currentInsuranceId,
                    amount: row.amount_paid
                });
            }
            const currentInsuranceId = insurances.get(row.insurance_provider).id;

            // sale_product
            if (!sale_product.has(row.sale_product)) {
                sale_product.set(row.sale_product, {
                    sale_id: row.sale_id,
                    product_id: currentProductId,
                    quantity: row.quantity,
                    price: row.price
                });
            }
            console.log("⏳ Insertando entidades únicas en PostgreSQL...");

            try {
                await this.db.query('BEGIN');

                for (const item of city.values()) {
                    await this.db.query(`INSERT INTO city (id_city, city_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [item.id, item.name]);
                }
                for (const item of supplier.values()) {
                    await this.db.query(`INSERT INTO supplier (id_supplier, supplier_name, supplier_phone, supplier_email) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [item.id, item.name, item.phone, item.email]);
                }
                for (const item of product_supplier.values()) {
                    await this.db.query(`INSERT INTO product_supplier (product_id, supplier_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [item.product_id, item.supplier_id]);
                }
                for (const item of products.values()) {
                    await this.db.query(`INSERT INTO product (id_product, product_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [item.id, item.name]);
                }
                for (const item of customer.values()) {
                    await this.db.query(`INSERT INTO customer (id_customer, customer_name, customer_email, customer_phone, customer_address) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`, [item.id, item.name, item.email, item.phone, item.address]);
                }
                for (const item of sale.values()) {
                    await this.db.query(`INSERT INTO sale (id_sale,customer_id,total_amount) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [item.id, item.customer_id, item.amount]);
                }
                for (const item of sale_product.values()) {
                    await this.db.query(`INSERT INTO sale_product(sale_id,id_product,sale_quantity,sale_price) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, [item.sale_id, item.product_id, item.quantity, item.price]);
                }

                await this.db.query('COMMIT');

                // 3. Sincronización con NoSQL
                const dataForMongo = this.parseRowsToMongoFormat(rows);
                await salesService.synchronizeHistories(dataForMongo);

                console.log("Datos guardados correctamente en SQL y NoSQL.");

            } catch (error) {
                await this.db.query('ROLLBACK');
                console.error("Ocurrió un error en la inserción:", error);
                throw error;
            }
        }
    }


}

export default new MigrationService();
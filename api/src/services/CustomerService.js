import postgresDB from '../config/postgres.js';
import AuditService from './AuditService.js';

class CustomerService {
    constructor() {
        this.db = postgresDB;
    }

    // Get all customers
    async getCustomers() {
        const res = await this.db.query(`
            SELECT c.*, cy.specialty as city_name 
            FROM customer c 
            LEFT JOIN city cy ON c.city = cy.city_Id
        `);
        return res.rows;
    }

    // Get customer by email
    async getCustomerByEmail(email) {
        const res = await this.db.query(`
            SELECT c.*, cy.specialty as city_name 
            FROM customer c 
            LEFT JOIN city cy ON c.city = cy.city_Id 
            WHERE LOWER(c.customer_email) = LOWER($1)
        `, [email]);
        return res.rows.length ? res.rows[0] : null;
    }

    // Get customer by ID
    async getCustomerById(customerId) {
        const res = await this.db.query(`
            SELECT c.*, cy.specialty as city_name 
            FROM customer c 
            LEFT JOIN city cy ON c.city = cy.city_Id 
            WHERE c.customer_id = $1
        `, [customerId]);
        return res.rows.length ? res.rows[0] : null;
    }

    // Create customer - validate email uniqueness
    async createCustomer(data) {
        const { customer_email, customer_name, customer_phone, customer_address, city } = data;

        // Validate required fields
        if (!customer_email || !customer_name) {
            throw new Error('Missing required fields: customer_email and customer_name');
        }

        // Check email uniqueness
        const existing = await this.getCustomerByEmail(customer_email);
        if (existing) {
            throw new Error(`Customer with email "${customer_email}" already exists`);
        }

        try {
            const res = await this.db.query(
                `INSERT INTO customer (customer_name, customer_email, customer_phone, customer_address, city) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [customer_name, customer_email, customer_phone || null, customer_address || null, city || null]
            );
            return res.rows[0];
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                throw new Error(`Customer email "${customer_email}" already exists`);
            }
            throw err;
        }
    }

    // Update customer by email - allow updating address and city
    async updateCustomerByEmail(email, data) {
        const existing = await this.getCustomerByEmail(email);
        if (!existing) return null;

        const { customer_name, customer_phone, customer_address, city } = data;
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (customer_name !== undefined) {
            updateFields.push(`customer_name = $${paramCount++}`);
            values.push(customer_name);
        }
        if (customer_phone !== undefined) {
            updateFields.push(`customer_phone = $${paramCount++}`);
            values.push(customer_phone);
        }
        if (customer_address !== undefined) {
            updateFields.push(`customer_address = $${paramCount++}`);
            values.push(customer_address);
        }
        if (city !== undefined) {
            updateFields.push(`city = $${paramCount++}`);
            values.push(city);
        }

        if (updateFields.length === 0) return existing;

        values.push(email);
        const query = `UPDATE customer SET ${updateFields.join(', ')} WHERE LOWER(customer_email) = LOWER($${paramCount}) RETURNING *`;
        const res = await this.db.query(query, values);
        return res.rows[0];
    }

    // Delete customer by email - verify no associated sales
    async deleteCustomerByEmail(email, performedBy = 'system') {
        const existing = await this.getCustomerByEmail(email);
        if (!existing) return null;

        try {
            // Check if customer has associated sales
            const salesCheck = await this.db.query(
                `SELECT COUNT(*) as count FROM sale WHERE customer = $1`,
                [existing.customer_id]
            );

            if (salesCheck.rows[0].count > 0) {
                throw new Error(
                    `Cannot delete customer "${email}": ${salesCheck.rows[0].count} sales are associated with this customer`
                );
            }

            // Delete customer if no sales
            await this.db.query(
                `DELETE FROM customer WHERE customer_id = $1`,
                [existing.customer_id]
            );

            await AuditService.logDeletion('Customer', email, existing, performedBy);
            return existing;
        } catch (err) {
            if (err.code === '23503') { // Foreign key violation
                throw new Error(`Cannot delete customer; associated records exist`);
            }
            throw err;
        }
    }
}

export default new CustomerService();

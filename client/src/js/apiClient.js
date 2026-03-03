/**
 * API Client Module
 * Centraliza todas las llamadas a la API REST
 * Maneja errores de forma global y consistente
 */

// Detectar si estamos en desarrollo o producción
const API_URL = window.location.origin.includes('localhost:8080') || window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

/**
 * Realiza una petición fetch a la API con manejo de errores
 * @param {string} endpoint - Ruta del endpoint (ej: /Products)
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {object} body - Cuerpo de la petición (opcional)
 * @returns {Promise<object>} Respuesta parseada
 */
async function apiFetch(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok && data.error) {
            const details = data.details
                ? data.details.map(d => typeof d === 'string' ? d : d.message).join(', ')
                : '';
            throw new Error(details ? `${data.error}: ${details}` : data.error);
        }

        return data;
    } catch (error) {
        throw error;
    }
}

// ============= PRODUCTOS =============
export const Products = {
    async getAll() {
        const response = await apiFetch('/Products');
        return response.data || [];
    },

    async getById(sku) {
        const response = await apiFetch(`/Products/${sku}`);
        return response.data;
    },

    async create(sku, name, categoryId, unitPrice) {
        return await apiFetch('/Products', 'POST', {
            sku,
            name,
            categoryId: parseInt(categoryId),
            unitPrice: parseFloat(unitPrice)
        });
    },

    async update(sku, data) {
        return await apiFetch(`/Products/${sku}`, 'PUT', data);
    },

    async delete(sku) {
        return await apiFetch(`/Products/${sku}`, 'DELETE');
    }
};

// ============= CLIENTES =============
export const Customers = {
    async getAll() {
        const response = await apiFetch('/Customers');
        return response.data || [];
    },

    async getByEmail(email) {
        const response = await apiFetch(`/Customers/${email}`);
        return response.data;
    },

    async create(customer_email, customer_name, customer_address = null) {
        return await apiFetch('/Customers', 'POST', {
            customer_email,
            customer_name,
            customer_address
        });
    },

    async update(email, data) {
        return await apiFetch(`/Customers/${email}`, 'PUT', data);
    },

    async delete(email) {
        return await apiFetch(`/Customers/${email}`, 'DELETE');
    }
};

// ============= VENTAS =============
export const Sales = {
    async getAll() {
        const response = await apiFetch('/Sales');
        return response.data || [];
    },

    async getById(transactionId) {
        const response = await apiFetch(`/Sales/${transactionId}`);
        return response.data || [];
    },

    async create(customer_email, products) {
        return await apiFetch('/Sales', 'POST', {
            customer_email,
            products
        });
    }
};

// ============= BUSINESS INTELLIGENCE =============
export const BI = {
    async getCustomerHistory(email) {
        const response = await apiFetch(`/bi/customer-history/${email}`);
        return response.data;
    },

    async getSuppliersSummary() {
        const response = await apiFetch('/bi/suppliers-summary');
        return response.data || [];
    },

    async getTopProductsByCategory(category) {
        const response = await apiFetch(`/bi/top-products-by-category/${category}`);
        return response.data || [];
    }
};

// ============= AUDITORÍA =============
export const Audit = {
    async getLog(limit = 100) {
        const response = await apiFetch(`/audit?limit=${limit}`);
        return response.data || [];
    }
};

// ============= STATS =============
export const Stats = {
    async getAll() {
        try {
            const [products, customers, sales] = await Promise.all([
                Products.getAll(),
                Customers.getAll(),
                Sales.getAll()
            ]);

            const totalSales = (sales || []).reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

            return {
                totalProducts: (products || []).length,
                totalCustomers: (customers || []).length,
                totalSales: (sales || []).length,
                totalRevenue: totalSales
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return {
                totalProducts: 0,
                totalCustomers: 0,
                totalSales: 0,
                totalRevenue: 0
            };
        }
    }
};

export default {
    Products,
    Customers,
    Sales,
    BI,
    Audit,
    Stats
};
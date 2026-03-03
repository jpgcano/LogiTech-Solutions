/**
 * Middleware de validación para campos obligatorios
 * Valida que no haya campos vacíos o nulos antes de llegar al servicio
 * También valida integridad referencial con FK en PostgreSQL
 */

import postgresDB from '../config/postgres.js';

// Helper para validar que un ID existe en una tabla
async function validateForeignKey(table, idField, idValue) {
    try {
        const result = await postgresDB.query(
            `SELECT 1 FROM ${table} WHERE ${idField} = $1 LIMIT 1`,
            [idValue]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error(`Error validating FK for ${table}.${idField}:`, error);
        return false;
    }
}

export const validateCustomerCreation = (req, res, next) => {
    const { customer_email, customer_name, customer_address, city } = req.body;

    const errors = [];

    if (!customer_email || customer_email.trim() === '') {
        errors.push('customer_email is required and cannot be empty');
    } else if (!isValidEmail(customer_email)) {
        errors.push('customer_email must be a valid email');
    }

    if (!customer_name || customer_name.trim() === '') {
        errors.push('customer_name is required and cannot be empty');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

export const validateCustomerUpdate = (req, res, next) => {
    const { customer_email, customer_name, customer_address, city } = req.body;

    const errors = [];

    if (customer_email !== undefined && customer_email !== null && customer_email.trim() === '') {
        errors.push('customer_email cannot be empty');
    }

    if (customer_name !== undefined && customer_name !== null && customer_name.trim() === '') {
        errors.push('customer_name cannot be empty');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

export const validateProductCreation = async (req, res, next) => {
    const { sku, name, categoryId, unitPrice } = req.body;

    const errors = [];

    if (!sku || sku.trim() === '') {
        errors.push('sku is required and cannot be empty');
    }

    if (!name || name.trim() === '') {
        errors.push('name is required and cannot be empty');
    }

    if (!categoryId || categoryId === '') {
        errors.push('categoryId is required and must reference a valid category');
    } else {
        const categoryExists = await validateForeignKey('category', 'category_id', categoryId);
        if (!categoryExists) {
            errors.push(`categoryId "${categoryId}" does not exist in category table`);
        }
    }

    if (unitPrice === undefined || unitPrice === null || unitPrice === '') {
        errors.push('unitPrice is required and must be a non-negative number');
    } else if (isNaN(unitPrice) || unitPrice < 0) {
        errors.push('unitPrice must be a non-negative number');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

export const validateProductUpdate = (req, res, next) => {
    const { name, categoryId, unitPrice } = req.body;

    const errors = [];

    if (name !== undefined && name !== null && name.trim() === '') {
        errors.push('name cannot be empty');
    }

    if (unitPrice !== undefined && unitPrice !== null) {
        if (isNaN(unitPrice) || unitPrice < 0) {
            errors.push('unitPrice must be a non-negative number');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

export const validateSaleCreation = (req, res, next) => {
    const { customer_email, products } = req.body;

    const errors = [];

    if (!customer_email || customer_email.trim() === '') {
        errors.push('customer_email is required and cannot be empty');
    } else if (!isValidEmail(customer_email)) {
        errors.push('customer_email must be a valid email');
    }

    if (!Array.isArray(products) || products.length === 0) {
        errors.push('products must be a non-empty array');
    } else {
        products.forEach((product, index) => {
            if (!product.sku || product.sku.trim() === '') {
                errors.push(`products[${index}].sku is required and cannot be empty`);
            }
            if (!product.quantity || product.quantity <= 0) {
                errors.push(`products[${index}].quantity is required and must be greater than 0`);
            }
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

export const validateSupplierCreation = async (req, res, next) => {
    const { supplier_email, supplier_name } = req.body;

    const errors = [];

    if (!supplier_email || supplier_email.trim() === '') {
        errors.push('supplier_email is required and cannot be empty');
    } else if (!isValidEmail(supplier_email)) {
        errors.push('supplier_email must be a valid email');
    }

    if (!supplier_name || supplier_name.trim() === '') {
        errors.push('supplier_name is required and cannot be empty');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            ok: false,
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

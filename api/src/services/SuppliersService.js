import SupplierModel from "../model/supplierModel.js";
class SupplierService {
    constructor() {
        this.suppliers = SupplierModel;
    }

    async addSupplier(supplier) {
        // validation
        if (!supplier || !supplier.supplier_email || !supplier.supplier_name) {
            throw new Error('Missing supplier_email or supplier_name');
        }
        // avoid duplicates
        const existing = await this.suppliers.findByEmail(supplier.supplier_email);
        if (existing) return existing;

        return await this.suppliers.createMany([supplier]);
    }

    async getSuppliers() {
        return await this.suppliers.model.find({});
    }
    async getSupplierByEmail(email) {
        return await this.suppliers.findByEmail(email);
    }
    async updateSupplierByEmail(email, data) {
        // update by replacing document fields (simple approach)
        const existing = await this.suppliers.findByEmail(email);
        if (!existing) return null;
        await this.suppliers.model.updateOne({ supplier_email: email }, { $set: data });
        return await this.suppliers.findByEmail(data.supplier_email || email);
    }
    async deleteSupplierByEmail(email, performedBy = 'system') {
        const existing = await this.suppliers.findByEmail(email);
        if (!existing) return null;
        try {
            await this.suppliers.model.deleteOne({ supplier_email: email });
        } catch (err) {
            // handle potential MongoDB errors (unlikely) or wrap for consistency
            throw new Error(`Unable to delete supplier: ${err.message}`);
        }
        return existing;
    }
    async deleteSuppliers() {
        return await this.suppliers.deleteAll() ;
    }
    async updateSuppliers(newSuppliers) {
        return await this.suppliers.updateMany(newSuppliers);
    }   
}

export default new SupplierService();
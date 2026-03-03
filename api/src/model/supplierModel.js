import mongoose from 'mongoose';


class SupplierModel {
    constructor() {
        this.schema = new mongoose.Schema({
            supplier_email: { type: String, required: true, unique: true, index: true },
            supplier_name: { type: String, required: true },
            products_supplied: [{
                product_sku: String,
                product_name: String,
                product_category: String,}]
            }, { 
                timestamps: true,
                versionKey: false 
            });

        this.model = mongoose.model('Suppliers', this.schema);
    }

    async deleteAll() {
        return await this.model.deleteMany({});
    }

    async createMany(data) {
        return await this.model.insertMany(data);
    }

    async findByEmail(email) {
        return await this.model.findOne({ supplier_email: email });
    }
    async updateMany(suppliers) {
        await this.deleteAll();
        return await this.createMany(suppliers);
    }
}

export default new SupplierModel();                
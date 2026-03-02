import mongoose from 'mongoose';

class SalesModel {
    constructor() {
        this.schema = new mongoose.Schema({
            customer_email: { type: String, required: true, unique: true, index: true },
            customer_name: { type: String, required: true },
            product_name: [{
                transaction_id: String,
                date: String,
                product_sku: String,
                product_name: String,
                product_category: String,
                quantity: Number,
                unit_price: Number,
                total_line_value: Number,
                supplier_name: String,
                supplier_email: String
            }]
        }, { 
            timestamps: true,
            versionKey: false 
        });

        // Esta es la instancia real de Mongoose protegida dentro de nuestra clase
        this.model = mongoose.model('Sales', this.schema);
    }

    // Métodos de la clase (Abstracción)
    async deleteAll() {
        return await this.model.deleteMany({});
    }

    async createMany(data) {
        return await this.model.insertMany(data);
    }

    async findByEmail(email) {
        return await this.model.findOne({ customer_email: email });
    }
}

// Exportamos una única instancia de nuestra clase
export default new SalesModel();
import SalesModel from '../model/sales.js';

class SalesService {
    constructor() {
        this.storage = SalesModel;
    }

    async synchronizeHistories(formattedData) {
        try {
            console.log("Sincronizando documentos en NoSQL...");
            if (!formattedData.length) return { ok: true };

            // Prepare bulk operations to minimize round-trips
            const ops = formattedData.map(record => ({
                updateOne: {
                    filter: { customer_email: record.customer_email },
                    update: { $set: record },
                    upsert: true
                }
            }));

            const result = await this.storage.model.bulkWrite(ops, { ordered: false });
            return { ok: true, result };
        } catch (error) {
            console.error("Error en la sincronización NoSQL:", error);
            throw error;
        }
    }

    async getFullReport(email) {
        const history = await this.storage.findByEmail(email);
        if (!history) return null;
        return history;
    }
}

export default new SalesService();
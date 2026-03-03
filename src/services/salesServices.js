import SalesModel from '../model/sales.js';

class SalesService {
    constructor() {
        this.storage = SalesModel;
    }

    async synchronizeHistories(formattedData) {
        try {
            console.log("Sincronizando documentos en NoSQL...");
            // en lugar de eliminar todo, actualizamos/creamos cada documento por cliente
            for (const record of formattedData) {
                await this.storage.model.updateOne(
                    { customer_email: record.customer_email },
                    { $set: record },
                    { upsert: true }
                );
            }
            return { ok: true };
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
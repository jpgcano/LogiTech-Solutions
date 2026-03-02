import SalesModel from '../model/sales.js';

class SalesService {
    constructor() {
        this.storage = SalesModel;
    }

    async synchronizeHistories(formattedData) {
        try {
            console.log("Sincronizando documentos en NoSQL...");
            await this.storage.deleteAll();
            const result = await this.storage.createMany(formattedData);
            return result;
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
import SupplierModel from "../model/supplierModel.js";
class SupplierService {
    constructor() {
        this.suppliers = SupplierModel;
    }

    async addSupplier(supplier) {
        return await this.suppliers.createMany([supplier]);
    }

    async getSuppliers() {
        return await this.suppliers.model.find({});
    }
    async deleteSuppliers() {
        return await this.suppliers.deleteAll() ;
    }
    async updateSuppliers(newSuppliers) {
        return await this.suppliers.updateMany(newSuppliers);
    }   
}

export default SupplierService;
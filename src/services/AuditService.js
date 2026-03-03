import AuditModel from '../model/auditModel.js';

class AuditService {
    constructor() {
        this.model = AuditModel;
    }

    async logDeletion(entity, key, payload, performedBy = 'system') {
        return await this.model.create({
            action: 'delete',
            entity,
            entity_key: key,
            payload,
            performed_by: performedBy
        });
    }

    async logUpdate(entity, key, payload, performedBy = 'system') {
        return await this.model.create({
            action: 'update',
            entity,
            entity_key: key,
            payload,
            performed_by: performedBy
        });
    }
}

export default new AuditService();

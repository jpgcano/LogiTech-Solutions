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

    async getAuditLog(limit = 100) {
        try {
            const result = await this.model.model
                .find({})
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .lean();

            return result.map(doc => ({
                type: doc.action?.toUpperCase() || 'UNKNOWN',
                entity_type: doc.entity || 'UNKNOWN',
                entity_id: doc.entity_key || 'N/A',
                user_email: doc.performed_by || 'system',
                changes: doc.payload || {},
                timestamp: doc.createdAt || new Date()
            }));
        } catch (error) {
            console.error('Error getting audit log:', error);
            return [];
        }
    }
}

export default new AuditService();

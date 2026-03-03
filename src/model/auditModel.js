import mongoose from 'mongoose';

class AuditModel {
    constructor() {
        this.schema = new mongoose.Schema({
            action: { type: String, required: true },
            entity: { type: String, required: true },
            entity_key: { type: String },
            payload: { type: mongoose.Schema.Types.Mixed },
            performed_by: { type: String },
            created_at: { type: Date, default: Date.now }
        }, { versionKey: false });

        this.model = mongoose.model('AuditLogs', this.schema);
    }

    async create(log) {
        return await this.model.create(log);
    }
}

export default new AuditModel();

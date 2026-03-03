import pg from 'pg';
const { Pool } = pg;
import { env } from "./env.js";

class PostgresDB {
    constructor() {
        this.pool = new Pool({
            connectionString: env.postgres_url,
        });
    }

    async connect() {
        let client;
        try {
            client = await this.pool.connect();
            console.log(`Conectado a PostgreSQL exitosamente)`);
        }
        catch (error) {
            console.error(`Error al conectar a PostgreSQL: ${error}`);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    // Metodo para obtener un cliente (para transacciones)
    async getClient() {
        try {
            return await this.pool.connect();
        } catch (error) {
            console.error(`Error al obtener cliente de PostgreSQL: ${error}`);
            throw error;
        }
    }

    // Metodo para ejecutar consultas SQL
    async query(text, params) {
        try {
            const res = await this.pool.query(text, params);
            return res;
        }
        catch (error) {
            console.error(`Error al ejecutar consulta: ${error}`);
            throw error;
        }
    }
}

export default new PostgresDB();
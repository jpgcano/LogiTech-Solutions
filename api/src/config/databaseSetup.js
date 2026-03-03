import fs from 'fs/promises'; // modulo para leer el csv
import path from 'path';
import { fileURLToPath } from 'url';
import postgresDB from './postgres.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DataBaseSetup {
    async initialize() {
        try {
            console.log("Configurando base de datos relacional...");

            // Orden crítico: Tablas -> Funciones/Procedures -> Triggers -> Vistas
            const scripts = [
                '../../script/table.sql',
                '../../script/procedures.sql',
                '../../script/bi_triggers.sql',
                '../../script/bi_views.sql'
            ];

            for (const relativePath of scripts) {
                const scriptPath = path.join(__dirname, relativePath);
                const sql = await fs.readFile(scriptPath, 'utf8');
                await postgresDB.query(sql);
                console.log(`Ejecutado con éxito: ${path.basename(relativePath)}`);
            }

            console.log("Base de datos completamente configurada.");
        } catch (error) {
            console.error("Error en la inicialización:", error);
            throw error;
        }
    }
}
export default new DataBaseSetup();
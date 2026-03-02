import fs from 'fs/promises'; // modulo para leer el csv
import path from 'path';
import { fileURLToPath } from 'url';
import postgresDB from './postgres.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

class  DataBaseSetup{
    async initialize(){

        try{        
            console.log("Leyendo base de datos... y configurando posgrest");

        // buscamos el archivo con las definiciones de tablas
        const slqFilePath = path.resolve(__dirname, '../../script/table.sql');
        const slqquery = await fs.readFile(slqFilePath, 'utf-8');

        // le pedimos  a posgres  que ejecute el query 
            await postgresDB.query(slqquery);
        console.log("Base de datos configurada correctamente");
        }catch(error){
            console.error("Error al configurar la base de datos:", error);
            throw error;
    }

}
}
export default new DataBaseSetup();
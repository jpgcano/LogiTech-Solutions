import { config } from "dotenv";
import {fileURLToPath} from "url";
import { dirname, resolve } from "path";
import dotenv from 'dotenv';


dotenv.config();


const __dirname=dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });
 const require =["MONGO_URL", "POSTGRES_URL",];
 for (const key of require) {
    if (!process.env[key]) {
        console.error(`La variable de entorno ${key} es requerida pero no está definida.`);
        throw new Error(`La variable de entorno ${key} es requerida pero no está definida.`);
    }

 }
 export const env ={
    port : process.env.PORT || 3000,
    mongo_url: process.env.MONGO_URL,
    postgres_url: process.env.POSTGRES_URL,
    file_data_csv: process.env.FILE_DATA_CSV || "data/simulation_saludplus_data.csv",
}
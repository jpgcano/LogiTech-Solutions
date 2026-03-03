import mongoose from "mongoose";
import { env } from "./env.js";


class MongoDBSetup {

    async connect() {
        try {
            console.log("Conectando a MongoDB...");
            await mongoose.connect(env.mongo_url)
            console.log("Conexión a MongoDB establecida correctamente");
        } catch (error) {
            console.error("Error al conectar a MongoDB:", error);
            process.exit(1);
            throw error;
        }
    }


}

export default new MongoDBSetup();
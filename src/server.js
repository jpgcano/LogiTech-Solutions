import app from "./app.js";
import DatabaseSetup from "./config/databaseSetup.js";
import {env} from "./config/env.js";
import postgresDB from "./config/postgres.js";
import mongoDB from "./config/mongo.js";


console.log("Conectando a la base de datos PostgreSQL...");

class Server {
    constructor() {
        this.port = env.port;
    }
    async start(){
        try{
            console.log("Iniciando servidor...");

            // conectando a base de datos
            await postgresDB.connect();
            // Crear tablas 
            await DatabaseSetup.initialize();
            // levantar mongo 
            await mongoDB.connect();
            // levantar el servidor
            app.server.listen(this.port,()=>{
                console.log(`Servidor escuchando en el puerto ${this.port}`);
            });

        }catch(error){
            console.error("Error al iniciar el servidor:", error);
            process.exit(1); // Salir con código de error
        }
    }

}

// iniciar el servidor
const server = new Server();
server.start(); 
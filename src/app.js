import express from 'express';
import router from './router/router.js';

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();  
  }

  middlewares(){
    // Para permitir reciber dados en JSON
    this.server.use(express.json());
  }

  routes(){
  
    //ruta de prueba
    this.server.get('/api/health',(req,res)=>{
      res.status(200).json({message:"API is healthy"})
    });
    // aqui colocar las rutas de la aplicación, por ejemplo:
    this.server.use('/api', router);
  }

}


export default  new App(); 
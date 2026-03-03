import express from 'express';
import helmet from 'helmet'; //Helmet es un middleware para Express.js que mejora automáticamente la seguridad de tu aplicación Node.js configurando diversos encabezados HTTP 
import rateLimit from 'express-rate-limit';
import router from './router/router.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();  
    this.errorHandling();
  }

  middlewares(){
    // basic security headers
    this.server.use(helmet());

    // rate limiting to avoid abuse (e.g. migration endpoint)
    this.server.use(rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 60, // limit each IP to 60 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
    }));

    // Para permitir reciber dados en JSON
    this.server.use(express.json());
    // simulación de usuario para auditoría
    this.server.use((req, res, next) => {
      req.user = { email: 'admin@logitech.com' };
      next();
    });
    // servir archivos estáticos del frontend si existen
    this.server.use(express.static('frontend'));
  }

  routes(){
  
    //ruta de prueba
    this.server.get('/api/health',(req,res)=>{
      res.status(200).json({message:"API is healthy"})
    });
    // aqui colocar las rutas de la aplicación, por ejemplo:
    this.server.use('/api', router);
  }

  errorHandling(){
    // Global error handler - must be after all routes
    this.server.use(errorHandler);
    
    // 404 Not Found handler - must be last
    this.server.use(notFoundHandler);
  }

}


export default  new App(); 
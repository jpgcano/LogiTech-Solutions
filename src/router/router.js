import { Router } from "express";
import MigrationService from "../services/MigrationService.js";

const router = Router();

router.post('/migrate', async (req, res) => {try {
        // Le pasamos "true" para que limpie la BD antes de insertar y puedas probar varias veces
        const result = await MigrationService.migrate(true); 
        res.status(200).json(result);
    } catch (error) {
        console.error("Error en el endpoint de migración:", error);
        res.status(500).json({ 
            ok: false, 
            error: "Hubo un error al ejecutar la migración",
            detalle: error.message 
        });
    }
});

export default router;
// ------------------------------------------------------------
// Archivo: script/mongo_validation.js
// Propósito: Añadir validaciones de esquema y índices en MongoDB
// Instrucciones: ejecutar dentro de `mongosh` o con `mongosh < script/mongo_validation.js`
// ------------------------------------------------------------

const dbName = "logitech_v2"; // ajustar si es necesario

// Nota: en mongosh ejecutar: use logitech_v2

// ---- Colección Suppliers (índice único por email) ----
try {
  db.createCollection("Suppliers", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["supplier_email", "supplier_name"],
        properties: {
          supplier_email: { bsonType: "string" },
          supplier_name: { bsonType: "string" },
          products_supplied: { bsonType: "array" }
        }
      }
    }
  });
} catch (e) { /* collection may already exist */ }

// Índice único para prevenir duplicados de proveedor
db.Suppliers.createIndex({ supplier_email: 1 }, { unique: true, background: true });

// ---- Colección Sales (historial por cliente) ----
try {
  db.createCollection("Sales", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["customer_email", "customer_name", "transactions"],
        properties: {
          customer_email: { bsonType: "string" },
          customer_name: { bsonType: "string" },
          transactions: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["transaction_id", "date", "products"],
              properties: {
                transaction_id: { bsonType: "string" },
                date: { bsonType: "date" },
                products: { bsonType: "array" },
                total: { bsonType: ["double", "int", "long", "decimal"] }
              }
            }
          }
        }
      }
    }
  });
} catch (e) { /* collection may already exist */ }

// Índice para consultas por email de cliente
db.Sales.createIndex({ customer_email: 1 }, { background: true });

// ---- Colección AuditLogs (registro de auditoría) ----
try {
  db.createCollection("AuditLogs", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["action", "entity", "entity_key", "created_at"],
        properties: {
          action: { bsonType: "string" },
          entity: { bsonType: "string" },
          entity_key: { bsonType: "string" },
          payload: { bsonType: ["object", "array", "string", "null"] },
          performed_by: { bsonType: "string" },
          created_at: { bsonType: "date" }
        }
      }
    }
  });
} catch (e) { /* collection may already exist */ }

// Índice para consultas por fecha en auditoría
db.AuditLogs.createIndex({ created_at: -1 }, { background: true });

print('Script de validación MongoDB ejecutado (o colecciones ya existían).');

# LogiTech Solutions - Data Migration & REST API

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/en/)
[![Express.js](https://img.shields.io/badge/Express.js-5.x-blue?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-13aa52?logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Latest-2496ED?logo=docker)](https://www.docker.com/)

> Modern data architecture for retail operations — migrate legacy Excel inventories into a maintainable SQL + NoSQL backend and expose BI-ready endpoints.

---

## Table of Contents

- Context & Goal
- Architecture Overview
- Quick Start
- Installation
- Running the Application
- API Reference
- Business Intelligence (BI)
- SQL Views & Triggers
- Data Migration
- Testing
- Project Structure
- Troubleshooting
- Performance & Optimization
- Contributing

---

## Context & Goal

MegaStore Global stores inventory, sales, suppliers and customers in a single Excel master sheet. The file grew unmanageable: price inconsistencies, duplicate addresses with typos and no real-time stock visibility.

This project demonstrates a migration to a modern, hybrid persistence architecture with:
- PostgreSQL (normalized transactional model)
- MongoDB (denormalized analytics & audit logs)
- Express.js REST API exposing CRUD and BI endpoints

Assessment objectives covered:
1. Data modeling and normalization (3NF for SQL)
2. NoSQL schema design (embedding vs referencing)
3. Bulk migration with idempotence and foreign-key correctness
4. REST backend and CRUD for main entities
5. BI queries implemented both in SQL (JOIN/GROUP BY) and MongoDB (Aggregation)
6. Audit logs stored in MongoDB for deletions/updates

---

## Architecture Overview

CSV source → MigrationService → PostgreSQL + MongoDB → Express API

Key PostgreSQL tables (3NF): city, customer, sale, sale_product, product, product_supplier, supplier, category

Key MongoDB collections: Sales (embedded transactions), Suppliers, AuditLogs

---

## Design Justification

### 1. PostgreSQL with Third Normal Form (3NF)

**Why 3NF?**
- **Eliminates Data Redundancy:** Each piece of information is stored only once. For example, a supplier's email and name are stored in the `supplier` table, not repeated in every transaction.
- **Maintains Referential Integrity:** Foreign keys ensure that if a supplier is deleted, dependent records are handled (via cascade or constraint violations).
- **Ensures Transactional Correctness:** Multi-table consistency is guaranteed via ACID transactions. When a sale is recorded, the product, customer, and supplier relationships are validated instantly.
- **Reduces Update Anomalies:** Updating a customer's address is a single operation, not scattered across multiple sale rows.

**Example:**
```
customer (customer_id, customer_email, customer_name, ...)
sale (transaction_id, customer_id, total, ...)
product (product_sku, product_name, product_category_id, ...)
```
A single customer record is referenced by multiple sales, avoiding duplication.

---

### 2. MongoDB for Denormalized Customer Profiles

**Why Denormalization?**
- **Fast Read-Heavy Analytics:** A single MongoDB document per customer contains their entire purchase history embedded. No JOINs needed.
- **Audit & Compliance:** Complete transaction snapshots (with all details at the time of purchase) are preserved for disputes or audits.
- **Scalability for BI:** Denormalized data is ideal for reporting and dashboards; analytics queries run in milliseconds.
- **Balance Between Systems:** SQL remains normali for operational writes; Mongo handles analytical reads.

**Structure:**
```javascript
{
  _id: ObjectId,
  customer_email: "john@example.com",
  customer_name: "John Doe",
  product_name: [
    {
      transaction_id: "TXN001",
      date: "2025-03-01",
      product_sku: "SKU123",
      quantity: 2,
      unit_price: 100.00,
      total_line_value: 200.00,
      ...
    }
  ]
}
```
A single `find()` by email retrieves the entire customer profile without joins.

---

### 3. Triggers & Views for Data Integrity

**Automatic Computation of Derived Data:**
- **Trigger `trg_update_sale_total_after_insert`:** Every time a line item (`sale_product`) is inserted, the trigger automatically sums all line items and updates `sale.total`. This ensures totals are always accurate without manual code.
- **View `suppliers_inventory_summary_view`:** Pre-computes supplier statistics (total items supplied, total inventory value) so BI queries are instant.
- **View `products_revenue_by_category_view`:** Groups products by category and sums revenue for dashboard queries.

**Why Not Calculate in Application Code?**
- **No Race Conditions:** Database-level computation is atomic; two concurrent transactions won't cause inconsistent totals.
- **Reduced Code Complexity:** Node.js doesn't need loops to sum values; the database handles it.
- **Audit Trail:** Every change is logged in the database itself, not dependent on application state.

---

## Rationale Summary

| Concern | Solution | Benefit |
|---------|----------|---------|
| Avoiding duplicate data storage | SQL 3NF normalization | Consistency, reduced storage, single source of truth |
| Fast analytics without joins | MongoDB embedded documents | Sub-millisecond reads for dashboards |
| Automatic total calculation | Triggers on Sales | No application code bugs; guaranteed correctness |
| Pre-computed BI metrics | SQL Views | Instant API responses for reports |

---

## Advanced Enhancements (Senior-level)

The project includes several improvements that go beyond the basic requirements:

* **Atomic migrations** – the entire CSV load into PostgreSQL runs in a single transaction (`BEGIN`/`COMMIT`), with a `ROLLBACK` on error. Partial imports are never left in the database.
* **Bulk operations in MongoDB** – `SalesService.synchronizeHistories` uses `bulkWrite()` instead of per-document `updateOne()` to dramatically reduce network round-trips during migration.
* **Schema validation** – request payloads for Products and Suppliers are validated against `zod` schemas at the router layer, rejecting bad data before it reaches the service.
* **Security middleware** – HTTP headers are hardened with `helmet` and rate limiting (`express-rate-limit`) throttles abusive clients.
* **Automated tests** – a small Jest suite using `supertest` verifies endpoint validation logic (see `tests/router.test.js`), demonstrating readiness for CI integration.
* **Docker healthchecks** – the `docker-compose.yml` now includes `healthcheck` sections for Postgres, Mongo, and the Node app.

These additions are optional for the original assignment but represent real-world best practices for production systems.

---

## Quick Start

This section walks you through two common ways to get the project running:

1. **Local development** (you have Node.js installed) 
2. **All‑in‑one Docker setup** (everything runs in containers)

### 1. Local development

1. **Clone the repo and install dependencies**
   ```bash
   git clone https://github.com/jpgcano/LogiTech-Solutions.git
   cd LogiTech-Solutions
   pnpm install      # or npm install
   ```

2. **Bring up the databases**
   - Option A: using Docker (recommended)
     ```bash
     docker run --name slogitech_v2 \
       -e POSTGRES_PASSWORD=123456 \
       -d -p 5439:5432 postgres:14
     docker run --name mongo_logitech_v2 \
       -d -p 27017:27017 mongo:latest
     ```
   - Option B: install PostgreSQL/MongoDB on your host and configure ports 5439/27017.

3. **Create a `.env` file** (example values):
   ```env
   PORT=3000
   MONGO_URL=mongodb://127.0.0.1:27017/logitech_v2
   POSTGRES_URL=postgresql://postgres:123456@localhost:5439/postgres
   FILE_DATA_CSV=data/AM-prueba-desempeno-data.csv
   ```

4. **Run the migration script**
   ```bash
   node scripts/run_migration.js
   ```
   (this reads the CSV, populates Postgres & MongoDB, and is safe to re-run)

5. **Start the API server**
   ```bash
   pnpm run dev      # starts with nodemon
   ```

6. **Verify**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/bi/suppliers-summary | jq .
   # open the frontend:
   xdg-open http://localhost:3000/
   ```

---

### 2. Docker (one command)

A script and npm shortcut automate the whole process:

1. Ensure Docker is installed on your machine.
2. From the project root run:
   ```bash
   pnpm run docker:quick
   ```

   This will:
   - start Postgres and MongoDB containers named `slogitech_v2` and `mongo_logitech_v2`
   - build a Docker image for the Node.js app
   - run the migration inside a temporary container
   - finally launch the API container listening on port 3000

3. The API and frontend are now reachable at `http://localhost:3000`.
4. To stop everything, press `Ctrl+C` in the terminal where `docker:quick` is running (it uses host networking so it stops containers automatically), or kill them manually:
   ```bash
   docker kill slogitech_v2 mongo_logitech_v2 logitech_app
   ```


### 3. Alternative: Docker Compose

If you prefer `docker-compose` you can run:
```bash
pnpm run docker:compose    # requires docker-compose installed
```
This is equivalent to `docker-compose up --build` and leaves containers running in the background.


## Frontend

A minimal browser frontend is available in the `frontend/` directory. When the server is running, navigate to `http://localhost:3000/` and you can execute the BI queries via a simple form. This is served automatically by Express as static content.

---

## Installation

Install Node.js 18+, pnpm (optional) and Docker. Then run `pnpm install`.

---

## Running the Application

- Development: `pnpm run dev`
- Production: `node src/server.js` (or run via Docker)
- Migration CLI: `node scripts/run_migration.js` (or `docker-compose exec app node scripts/run_migration.js`)

---

## API Reference

Base URL: `http://localhost:3000/api`

### Health Check
- `GET /api/health` — API health status

### Migration
- `POST /api/migrate` — Initialize database (idempotent, clears and reloads from CSV)

### Products CRUD
- `GET /api/Products` — List all products
- `GET /api/Products/:sku` — Get product by SKU
- `POST /api/Products` — Create new product (validates SKU uniqueness)
- `PUT /api/Products/:sku` — Update product (price, name, category)
- `DELETE /api/Products/:sku` — Delete product (prevents deletion if referenced by sales)

### Customers CRUD
- `GET /api/Customers` — List all customers
- `GET /api/Customers/:email` — Get customer by email
- `POST /api/Customers` — Create new customer (validates email uniqueness)
- `PUT /api/Customers/:email` — Update customer (address, city, phone, name)
- `DELETE /api/Customers/:email` — Delete customer (prevents deletion if has associated sales)

### Suppliers CRUD
- `GET /api/Suppliers` — List all suppliers
- `POST /api/Suppliers` — Create new supplier
- `PUT /api/Suppliers/:email` — Update supplier
- `DELETE /api/Suppliers/:email` — Delete supplier

### Sales Management
- `GET /api/Sales` — List all sales transactions
- `GET /api/Sales/:transactionId` — Get sales details for a transaction
- `POST /api/Sales` — Create new sale (SQL transaction - inserts into sale and sale_product atomically, then syncs to MongoDB)

**Sale Creation Request Body:**
```json
{
  "customer_email": "customer@example.com",
  "products": [
    { "sku": "PROD-001", "quantity": 2 },
    { "sku": "PROD-002", "quantity": 1 }
  ]
}
```

### Business Intelligence (BI)
- `GET /api/bi/suppliers-summary` — Suppliers ranked by total inventory value and items supplied
- `GET /api/bi/customer-history/:email` — Customer purchase history with transaction lines and totals
- `GET /api/bi/top-products-by-category/:category` — Top products in category ordered by revenue

---

## Business Intelligence (BI)

1) Suppliers analysis — `GET /api/bi/suppliers-summary`
- Returns suppliers ranked by total inventory value and items supplied.

2) Customer behavior — `GET /api/bi/customer-history/:email`
- Returns a customer's purchase history with transaction lines and totals.

3) Star products — `GET /api/bi/top-products-by-category/:category`
- Returns products in a category ordered by revenue generated.

The SQL endpoints use JOINs and GROUP BY; the Mongo endpoint uses Aggregation Framework.

---

## SQL Views & Triggers (examples)

See `script/bi_views.sql` and `script/bi_triggers.sql` for ready-to-run SQL DDL. They provide:
- `suppliers_inventory_summary_view`, `products_revenue_by_category_view`, `customer_transaction_lines_view`
- `fn_update_sale_total_from_lines` trigger function (triggers: `trg_update_sale_total_after_*`) to keep `sale.total` in sync with `sale_product` lines
- `fn_update_product_supplier_total_value` trigger function (triggers: `trg_update_product_supplier_after_*`) to keep `product_supplier.total_line_value` accurate

Run them in `psql`:

```bash
psql "${POSTGRES_URL}" -f script/bi_views.sql
psql "${POSTGRES_URL}" -f script/bi_triggers.sql
```

---

## Data Migration

`MigrationService` reads the CSV, normalizes entities, and loads:
- PostgreSQL: master tables and relationships
- MongoDB: Sales documents with embedded transactions

Idempotence: migration checks by unique keys (emails, SKUs) and updates instead of duplicating.

---

## Testing

Import `docs/postman_collection.json` into Postman and set `{{base_url}}` to `http://localhost:3000`.

Examples (curl):

```bash
curl http://localhost:3000/api/bi/suppliers-summary | jq .
curl http://localhost:3000/api/bi/customer-history/andres.lopez@gmail.com | jq .
curl http://localhost:3000/api/bi/top-products-by-category/Electronics | jq .
```

---

## Project Structure

```
LogiTech-Solutions/
├── data/  # CSV and ER diagram
├── docs/  # postman collection and diagram pointer
├── script/  # SQL scripts (views, triggers, procedures, mongo validation)
├── scripts/  # run_migration.js
└── src/  # server, services, models, router
```

---

## Troubleshooting

- PostgreSQL connection: ensure Docker container `slogitech_v2` is running and port 5439 is exposed.
- MongoDB connection: ensure `mongo_logitech_v2` is running on port 27017.
- If `relation 'city' does not exist` run `node scripts/run_migration.js` to initialize schema.

---

## Performance & Optimization

- Add indexes: `customer.customer_email`, `supplier.supplier_email`, `product.product_sku`.
- Use views and materialized views for heavy aggregations.
- Triggers keep derived totals current but consider moving heavy recalculations to background jobs if volume grows.

---

## Contributing

Fork, branch, implement, open PR.

---

## License

Proprietary - LogiTech Solutions © 2026

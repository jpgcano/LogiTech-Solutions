# 🏗️ LogiTech Solutions - Clean Architecture

## 📋 Resumen Ejecutivo

LogiTech Solutions ha sido refactorizado usando **Clean Architecture**, separando completamente el Frontend del Backend en contenedores independientes, permitiendo escalabilidad horizontal, despliegues independientes y mantenibilidad profesional.

---

## 📂 Estructura de Directorios

```
LogiTech-Solutions/
├── api/                          # Backend - Node.js Express API
│   ├── src/
│   │   ├── app.js               # Express app configuration
│   │   ├── server.js            # Server entry point
│   │   ├── config/
│   │   │   ├── databaseSetup.js
│   │   │   ├── env.js
│   │   │   ├── mongo.js
│   │   │   └── postgres.js
│   │   ├── model/               # Data models
│   │   │   ├── auditModel.js
│   │   │   ├── sales.js
│   │   │   └── supplierModel.js
│   │   ├── router/
│   │   │   └── router.js        # API endpoints
│   │   ├── services/            # Business logic
│   │   │   ├── AuditService.js
│   │   │   ├── MigrationService.js
│   │   │   ├── ProductService.js
│   │   │   ├── salesServices.js
│   │   │   └── SuppliersService.js
│   │   └── middleware/
│   │       └── validator.js     # Input validation
│   ├── script/                   # Database initialization
│   │   ├── bi_triggers.sql
│   │   ├── bi_views.sql
│   │   ├── mongo_validation.js
│   │   ├── procedures.sql
│   │   ├── queries.sql
│   │   └── table.sql
│   ├── data/
│   │   └── AM-prueba-desempeno-data.csv  # Seed data
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── Dockerfile               # Production Docker image
│   └── .env                      # Environment variables
│
├── client/                       # Frontend - SPA with Nginx
│   ├── src/
│   │   ├── index.html           # Semantic HTML (130 lines)
│   │   ├── css/
│   │   │   └── styles.css       # Global styles (3000+ lines)
│   │   └── js/
│   │       ├── app.js           # Application orchestrator (350 lines)
│   │       ├── apiClient.js     # API communication layer (150 lines)
│   │       └── uiManager.js     # Reusable UI components (180 lines)
│   ├── Dockerfile               # Nginx production image
│   ├── nginx.conf               # Reverse proxy configuration
│   └── .env                      # Frontend config (optional)
│
├── docker-compose.yml           # Orchestration - 4 services
├── package.json                 # Root package (for scripts)
└── README.md                    # Documentation

```

---

## 🐳 Docker Architecture (4-Service Setup)

### Service Stack

```yaml
┌─────────────────────────────────────────────────────────────┐
│                    logitech_network (Bridge)                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ web (Nginx Alpine - Port 8080)                       │   │
│  │ ├─ Serves static assets (index.html, css, js)       │   │
│  │ ├─ SPA routing (try_files $uri $uri/ /index.html)   │   │
│  │ ├─ Reverse proxy: /api/* → http://api:3000/api/*   │   │
│  │ └─ Cache headers (1 year for static assets)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ api (Node.js 18-Alpine - Port 3000)                 │   │
│  │ ├─ Express 5.2.1 REST API                           │   │
│  │ ├─ CORS middleware enabled                           │   │
│  │ ├─ Routes: /Products, /Customers, /Sales, /BI, ...  │   │
│  │ ├─ Depends on: postgres (healthy) + mongo (healthy) │   │
│  │ └─ Health check: GET /api/health                    │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↙                              ↘                   │
│  ┌─────────────────────┐      ┌────────────────────────┐    │
│  │ postgres:5432       │      │ mongo:27017            │    │
│  │ (PostgreSQL 15)     │      │ (MongoDB 7)            │    │
│  │ Volume: pgdata      │      │ Volume: mongodata      │    │
│  │ Seed: table.sql     │      │ Seed: mongo_validation │    │
│  └─────────────────────┘      └────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Service Details

| Service | Image | Port | Purpose | Health Check |
|---------|-------|------|---------|--------------|
| **web** | `nginx:alpine` | 8080 | Static assets + API proxy | `wget /index.html` |
| **api** | `node:18-alpine` (custom) | 3000 | REST API | `curl /api/health` |
| **postgres** | `postgres:15-alpine` | 5432 | Relational data | `pg_isready` |
| **mongo** | `mongo:7-alpine` | 27017 | NoSQL/BI data | `mongosh ping` |

### Startup Order (Service Dependencies)

```
postgres (healthy) → api (healthy) → web (healthy)
   ↑                                    ↑
   └────── mongo (healthy) ────────────┘

Condition: service_healthy ensures previous services are ready
```

---

## 🎯 Frontend Architecture

### HTML Structure (client/src/index.html)

**Semantic, Clean, No Inline Code**

```html
<!DOCTYPE html>
<html>
<head>
    <title>LogiTech Solutions</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <aside class="sidebar">
        <h1>LogiTech</h1>
        <nav>
            <ul class="nav-menu">
                <li><button class="nav-btn active" data-view="inventario">📦 Inventario</button></li>
                <li><button class="nav-btn" data-view="clientes">👥 Clientes</button></li>
                <li><button class="nav-btn" data-view="ventas">🛒 Ventas</button></li>
                <li><button class="nav-btn" data-view="reportes">📊 Reportes</button></li>
                <li><button class="nav-btn" data-view="auditoria">🔍 Auditoría</button></li>
            </ul>
        </nav>
    </aside>

    <main class="main-container">
        <div class="header">
            <h2><span id="view-title">Inventario</span></h2>
        </div>

        <!-- Dynamic Content Containers -->
        <div id="inventario" class="content active">
            <div class="view"><!-- dynamically populated --></div>
        </div>
        <div id="clientes" class="content">
            <div class="view"><!-- dynamically populated --></div>
        </div>
        <div id="ventas" class="content">
            <div class="view"><!-- dynamically populated --></div>
        </div>
        <div id="reportes" class="content">
            <div class="view"><!-- dynamically populated --></div>
        </div>
        <div id="auditoria" class="content">
            <div class="view"><!-- dynamically populated --></div>
        </div>
    </main>

    <!-- Single Module Entry Point -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

### JavaScript Modules

#### 1. **apiClient.js** - API Communication Layer (150 lines)

```javascript
// Single source of truth for all backend communication
export const Products = {
    async getAll() { return await apiFetch('/Products'); },
    async create(sku, name, categoryId, unitPrice) { ... },
    async update(id, data) { ... },
    async delete(id) { ... }
};

export const Customers = {
    async getAll() { ... },
    async create(email, name, city) { ... },
    async update(id, data) { ... },
    async delete(id) { ... }
};

export const Sales = {
    async create(customerId, items) { ... }
};

export const BI = {
    async getCustomerHistory(email) { ... },
    async getSuppliersSummary() { ... },
    async getTopProductsByCategory() { ... }
};

export const Audit = {
    async getLog(limit) { ... }
};

export const Stats = {
    async getAll() { ... }
};

// Shared helper function
async function apiFetch(endpoint, method = 'GET', body = null) {
    const url = `${apiUrl}${endpoint}`;
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details?.[0] || 'API Error');
    }
    
    return await response.json();
}
```

#### 2. **uiManager.js** - Reusable Components (180 lines)

```javascript
// Component Factory Pattern - Returns HTMLElement
export function createTable(data, columns) {
    // Builds table dynamically based on column config
    // Column types: 'text', 'currency', 'date', 'action', 'badge'
}

export function createCart(items, onRemove, onCheckout) {
    // Shopping cart with remove buttons and checkout action
}

export function createStatsCards(stats) {
    // Grid of stat cards (products count, revenue, etc.)
}

export function showToast(message, type = 'info', duration = 3000) {
    // Toast notifications (success, error, info)
}

export function createSpinner() {
    // Loading indicator with CSS animation
}

export function createEmptyState(message) {
    // Placeholder for empty data states
}

export function createDetailView(obj) {
    // Key-value pair display for single records
}
```

#### 3. **app.js** - Application Orchestrator (350 lines)

```javascript
import * as apiClient from './apiClient.js';
import * as uiManager from './uiManager.js';

// Global app state
const appState = {
    currentView: 'inventario',
    cart: [],
    apiUrl: 'http://localhost:3000/api'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupNavigation();
    await loadProducts();
});

// View switching
async function switchView(viewName) {
    appState.currentView = viewName;
    // Update DOM classes
    // Load view-specific data
    // Render with uiManager components
}

// Form handlers
document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await apiClient.Products.create(...);
    await loadProducts();
});

// Cart management
function addToCart(item) {
    appState.cart.push(item);
    uiManager.showToast(`${item.name} added to cart`, 'success');
}

function completeSale() {
    // Group items by customer
    // Call Sales.create() for each transaction
    // Clear cart
}
```

### Styling (client/src/css/styles.css)

- **Variables**: `--primary`, `--danger`, `--success`, etc.
- **Components**: Sidebar, Tables, Forms, Buttons, Cards, Badges, Toasts
- **Responsive**: Mobile-first (768px, 480px breakpoints)
- **Total**: 3000+ lines of clean, organized CSS

---

## 🔧 Backend Architecture

### API Routes (api/src/router/router.js)

```
GET    /api/health                 # Health check
GET    /api/Products               # List all products
POST   /api/Products               # Create product
GET    /api/Products/:id           # Get product by ID
PUT    /api/Products/:id           # Update product
DELETE /api/Products/:id           # Delete product

GET    /api/Customers              # List customers
POST   /api/Customers              # Create customer
GET    /api/Customers/:id          # Get customer
PUT    /api/Customers/:id          # Update customer
DELETE /api/Customers/:id          # Delete customer

GET    /api/Sales                  # List sales
POST   /api/Sales                  # Create sale
GET    /api/Sales/:id              # Get sale details

GET    /api/BI/customer-history    # Customer purchase history
GET    /api/BI/suppliers-summary   # Supplier summary
GET    /api/BI/top-products        # Top products by category

GET    /api/audit                  # Audit log

GET    /api/stats                  # Aggregate statistics

POST   /api/migrate                # Load CSV data
```

### Database Integration

#### PostgreSQL (Relational Data)

```sql
-- Tables
- products (sku, name, category_id, unit_price, stock)
- customers (email, name, city, credit_limit)
- sales (id, customer_id, sale_date, total)
- sale_items (sale_id, product_sku, quantity, unit_price)

-- Triggers
- fn_decrease_stock_on_sale() → Auto-decrement stock on unconfirmed sales
- fn_increase_stock_on_cancellation() → Restore stock on cancellation

-- Views
- v_customer_history → Customer purchases with totals
- v_top_products_by_category → Product performance
```

#### MongoDB (NoSQL/BI Data)

```javascript
// Collections
- products_bi (SKU, name, category, statistics, last_updated)
- sales_bi (customer_email, products purchased, total_spent, history)
- audit_log (action, table, timestamp, user_id, changes)
```

### Service Layer (Resilience)

**SalesService.js** - Transactional Integrity

```javascript
export async function createSale(customerId, items) {
    try {
        // 1. Create in PostgreSQL (transactional)
        const sale = await createInPostgres(customerId, items);
        
        // 2. Sync to MongoDB with retry logic (3 retries)
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await syncToMongoDB(sale);
                break; // Success, exit loop
            } catch (error) {
                if (attempt === 3) throw error; // Final failure, log and continue
                await delay(1000 * attempt); // Exponential backoff
            }
        }
        
        // 3. Return success regardless of MongoDB status
        return sale;
    } catch (error) {
        throw new Error(`Sale creation failed: ${error.message}`);
    }
}
```

### Middleware

**validator.js** - Input Validation

```javascript
// Validates foreign keys exist in PostgreSQL
export async function validateForeignKey(table, column, value) {
    const result = await postgres.query(
        `SELECT 1 FROM ${table} WHERE ${column} = $1`,
        [value]
    );
    if (result.rows.length === 0) {
        throw new Error(`Invalid ${column}: ${value}`);
    }
}
```

---

## 🚀 Deployment & Operations

### Local Development

```bash
# Start entire stack with one command
docker-compose up --build

# Access
- Frontend: http://localhost:8080
- API: http://localhost:3000
- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
```

### Production Deployment

```bash
# Build Docker images
docker-compose build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f web

# Stop stack
docker-compose down

# Clean up (remove volumes)
docker-compose down -v
```

### Health Monitoring

```bash
# Check service status
docker-compose ps

# Verify API health
curl http://localhost:3000/api/health

# Check database connectivity
curl http://localhost:8080/api/health (through proxy)

# View service logs
docker-compose logs api
docker-compose logs web
```

---

## ✅ Validation Checklist

After deployment, verify:

- [ ] Frontend loads at http://localhost:8080
- [ ] Sidebar navigation works
- [ ] Create product form submits successfully
- [ ] Create customer form works
- [ ] Add to cart functionality
- [ ] Complete sale creates transaction
- [ ] Auditoría shows recent events
- [ ] Stats dashboard displays correct counts
- [ ] API health check returns 200

---

## 📊 Architecture Principles Applied

1. **Separation of Concerns**
   - Frontend (Nginx) ≠ API (Express) ≠ Data (PostgreSQL, MongoDB)
   - Each service has single responsibility

2. **Independent Scalability**
   - Scale API horizontally behind load balancer
   - Scale Nginx for static content distribution
   - Scale databases independently

3. **Decoupled Communication**
   - Frontend → API via REST (no direct DB access)
   - API → Databases via connection pools
   - Services communicate via Docker network DNS

4. **Resilience & Reliability**
   - Health checks prevent startup race conditions
   - Service dependencies ensure order (depends_on)
   - Retry logic for MongoDB synchronization
   - Error handling at all layers

5. **Maintainability**
   - Modular JavaScript (apiClient, uiManager, app)
   - Component factory pattern (avoid string HTML)
   - Environment variables for configuration
   - Clear file organization

6. **Production Readiness**
   - Alpine base images (minimal size/attack surface)
   - No hot-reload in containers (npm start, not nodemon)
   - Proper logging and error messages
   - CORS enabled for cross-origin requests

---

## 📞 Support

For questions or issues:
1. Check service logs: `docker-compose logs [service]`
2. Verify health: `curl http://localhost:3000/api/health`
3. Check network: `docker network ls` and `docker inspect logitech_network`
4. Review environment variables: `api/.env`

---

**Status**: ✅ Production-Ready  
**Last Updated**: 2024  
**Architecture Pattern**: Clean Architecture with Docker Compose Orchestration

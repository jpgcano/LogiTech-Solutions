/**
 * Application Main Module
 * Orquestador principal que une apiClient y uiManager
 * Gestiona navegación, eventos del DOM y flujos de negocio
 */

import { Products, Customers, Sales, BI, Audit, Stats } from './apiClient.js';
import {
    showToast,
    createSpinner,
    createEmptyState,
    createTable,
    createStatsCards,
    createCart,
    clearContainer
} from './uiManager.js';

// Estado global de la aplicación
const appState = {
    currentView: 'inventario',
    cart: [],
    apiUrl: '/api'
};

// Exponemos el objeto antes de DOMContentLoaded para que esté disponible
window.appManager = {
    addToCart,
    loadAuditLog
};

// ============= INICIALIZACIÓN =============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 LogiTech App Inicializado');

    // Configurar navegación
    setupNavigation();

    // Cargar datos iniciales
    await switchView('inventario');
});

// ============= NAVEGACIÓN =============
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchView(e.target.dataset.view);
        });
    });
}

async function switchView(viewName) {
    appState.currentView = viewName;

    // Actualizar UI de navegación
    document.querySelectorAll('.content').forEach(el => el.classList.remove('active'));
    document.getElementById(viewName)?.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');

    // Actualizar título
    const titles = {
        inventario: 'Inventario',
        clientes: 'Clientes',
        ventas: 'Ventas',
        reportes: 'Reportes BI',
        auditoria: 'Auditoría'
    };
    document.getElementById('view-title').textContent = titles[viewName] || viewName;

    // Cargar datos según la vista
    try {
        if (viewName === 'inventario') await loadProducts();
        if (viewName === 'clientes') await loadCustomers();
        if (viewName === 'ventas') await loadSales();
        if (viewName === 'reportes') await loadReports();
        if (viewName === 'auditoria') await loadAuditLog();
    } catch (error) {
        showToast(`Error cargando vista: ${error.message}`, 'error');
    }
}

// ============= PRODUCTOS =============
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    clearContainer(container);
    container.appendChild(createSpinner());

    try {
        const products = await Products.getAll();

        clearContainer(container);
        if (products.length === 0) {
            container.appendChild(createEmptyState('No hay productos registrados'));
            return;
        }

        const columns = [
            { key: 'product_sku', label: 'SKU', variant: 'strong' },
            { key: 'product_name', label: 'Nombre' },
            { key: 'product_category', label: 'Categoría' },
            { key: 'unit_price', label: 'Precio', type: 'currency' },
            {
                label: 'Acciones',
                type: 'action',
                actions: [
                    {
                        label: 'Eliminar',
                        variant: 'danger',
                        handler: (row) => deleteProduct(row.product_sku)
                    }
                ]
            }
        ];

        const table = createTable(products, columns);
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-responsive';
        tableDiv.appendChild(table);
        container.appendChild(tableDiv);
    } catch (error) {
        clearContainer(container);
        showToast(`Error: ${error.message}`, 'error');
    }
}

document.getElementById('productForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        sku: document.getElementById('productSku').value,
        name: document.getElementById('productName').value,
        categoryId: document.getElementById('productCategoryId').value,
        unitPrice: document.getElementById('productUnitPrice').value
    };

    try {
        await Products.create(data.sku, data.name, data.categoryId, data.unitPrice);
        showToast('✅ Producto agregado exitosamente', 'success');
        e.target.reset();
        await loadProducts();
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
});

async function deleteProduct(sku) {
    if (!confirm(`¿Confirmar eliminación de ${sku}?`)) return;

    try {
        await Products.delete(sku);
        showToast('✅ Producto eliminado', 'success');
        await loadProducts();
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// ============= CLIENTES =============
async function loadCustomers() {
    const container = document.getElementById('customersContainer');
    clearContainer(container);
    container.appendChild(createSpinner());

    try {
        const customers = await Customers.getAll();

        clearContainer(container);
        if (customers.length === 0) {
            container.appendChild(createEmptyState('No hay clientes registrados'));
            return;
        }

        const columns = [
            { key: 'customer_email', label: 'Email', variant: 'strong' },
            { key: 'customer_name', label: 'Nombre' },
            { key: 'customer_address', label: 'Dirección' },
            {
                label: 'Acciones',
                type: 'action',
                actions: [
                    {
                        label: 'Eliminar',
                        variant: 'danger',
                        handler: (row) => deleteCustomer(row.customer_email)
                    }
                ]
            }
        ];

        const table = createTable(customers, columns);
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-responsive';
        tableDiv.appendChild(table);
        container.appendChild(tableDiv);
    } catch (error) {
        clearContainer(container);
        showToast(`Error: ${error.message}`, 'error');
    }
}

document.getElementById('customerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        await Customers.create(
            document.getElementById('customerEmail').value,
            document.getElementById('customerName').value,
            document.getElementById('customerAddress').value
        );
        showToast('✅ Cliente agregado exitosamente', 'success');
        e.target.reset();
        await loadCustomers();
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
});

async function deleteCustomer(email) {
    if (!confirm(`¿Confirmar eliminación de ${email}?`)) return;

    try {
        await Customers.delete(email);
        showToast('✅ Cliente eliminado', 'success');
        await loadCustomers();
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// ============= VENTAS =============
async function loadSales() {
    const cartContainer = document.getElementById('cartContainer');
    const salesContainer = document.getElementById('salesContainer');

    // Renderizar carrito
    clearContainer(cartContainer);
    cartContainer.appendChild(createCart(appState.cart, removeFromCart, completeSale));

    // Cargar historial de ventas
    clearContainer(salesContainer);
    salesContainer.appendChild(createSpinner());

    try {
        const sales = await Sales.getAll();

        clearContainer(salesContainer);
        if (sales.length === 0) {
            salesContainer.appendChild(createEmptyState('No hay ventas registradas'));
            return;
        }

        const columns = [
            { key: 'transaction_id', label: 'ID Transacción', variant: 'strong' },
            { key: 'customer_email', label: 'Cliente' },
            { key: 'datesale', label: 'Fecha', type: 'date' },
            { key: 'total', label: 'Total', type: 'currency' },
            { key: 'items_count', label: 'Items', type: 'badge' }
        ];

        const table = createTable(sales, columns);
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-responsive';
        tableDiv.appendChild(table);
        salesContainer.appendChild(tableDiv);
    } catch (error) {
        clearContainer(salesContainer);
        showToast(`Error: ${error.message}`, 'error');
    }
}

document.getElementById('addToCartBtn')?.addEventListener('click', addToCart);

function addToCart() {
    const email = document.getElementById('saleCustomerEmail').value;
    const sku = document.getElementById('saleProductSku').value;
    const qty = parseInt(document.getElementById('saleQuantity').value);

    if (!email || !sku || qty <= 0) {
        showToast('⚠️ Completa todos los campos', 'info');
        return;
    }

    appState.cart.push({
        customer_email: email,
        sku,
        quantity: qty
    });

    showToast('✅ Agregado al carrito', 'success');
    document.getElementById('saleQuantity').value = '1';

    // Actualizar visualización del carrito
    if (appState.currentView === 'ventas') {
        loadSales();
    }
}

function removeFromCart(index) {
    appState.cart.splice(index, 1);
    if (appState.currentView === 'ventas') {
        loadSales();
    }
}

async function completeSale() {
    if (appState.cart.length === 0) {
        showToast('⚠️ El carrito está vacío', 'info');
        return;
    }

    // Agrupar por customer_email
    const grouped = {};
    appState.cart.forEach(item => {
        if (!grouped[item.customer_email]) grouped[item.customer_email] = [];
        grouped[item.customer_email].push({ sku: item.sku, quantity: item.quantity });
    });

    try {
        for (const [email, products] of Object.entries(grouped)) {
            await Sales.create(email, products);
        }

        showToast('✅ Venta completada exitosamente', 'success');
        appState.cart = [];
        await loadSales();
    } catch (error) {
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// ============= REPORTES =============
async function loadReports() {
    const statsContainer = document.getElementById('statsContainer');
    const reportForm = document.getElementById('reportForm');

    // Cargar estadísticas
    clearContainer(statsContainer);
    statsContainer.appendChild(createSpinner());

    try {
        const stats = await Stats.getAll();
        clearContainer(statsContainer);

        const statsObj = {
            products: { icon: '📦', label: 'Productos', value: stats.totalProducts },
            customers: { icon: '👥', label: 'Clientes', value: stats.totalCustomers },
            sales: { icon: '💰', label: 'Ventas', value: stats.totalSales },
            revenue: { icon: '💵', label: 'Ingresos', value: `$${stats.totalRevenue.toFixed(2)}` }
        };

        statsContainer.appendChild(createStatsCards(statsObj));
    } catch (error) {
        clearContainer(statsContainer);
        showToast(`Error: ${error.message}`, 'error');
    }

    // Formulario de búsqueda
    reportForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reportEmail').value;
        const resultsDiv = document.getElementById('reportResults');

        clearContainer(resultsDiv);
        resultsDiv.appendChild(createSpinner());

        try {
            const history = await BI.getCustomerHistory(email);

            clearContainer(resultsDiv);
            if (!history || !history.product_history) {
                resultsDiv.appendChild(createEmptyState('Sin historial de compras'));
                return;
            }

            const details = document.createElement('div');
            details.innerHTML = `<h4>${history.customer_name}</h4>`;

            const columns = [
                { key: 'date', label: 'Fecha', type: 'date' },
                { key: 'product_name', label: 'Producto' },
                { key: 'quantity', label: 'Qty' },
                { key: 'unit_price', label: 'Precio', type: 'currency' },
                { key: 'total_line_value', label: 'Total', type: 'currency' }
            ];

            const table = createTable(history.product_history, columns);
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table-responsive';
            tableDiv.appendChild(table);

            details.appendChild(tableDiv);
            resultsDiv.appendChild(details);
        } catch (error) {
            clearContainer(resultsDiv);
            showToast(`Error: ${error.message}`, 'error');
        }
    });
}

// ============= AUDITORÍA =============
async function loadAuditLog() {
    const container = document.getElementById('auditContainer');
    clearContainer(container);
    container.appendChild(createSpinner());

    try {
        const events = await Audit.getLog(100);

        clearContainer(container);
        if (events.length === 0) {
            container.appendChild(createEmptyState('No hay eventos registrados'));
            return;
        }

        const columns = [
            { key: 'type', label: 'Tipo' },
            { key: 'entity_type', label: 'Entidad' },
            { key: 'entity_id', label: 'ID' },
            { key: 'user_email', label: 'Usuario' },
            { key: 'timestamp', label: 'Fecha', type: 'date' }
        ];

        const table = createTable(events, columns);
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-responsive';
        tableDiv.appendChild(table);
        container.appendChild(tableDiv);
    } catch (error) {
        clearContainer(container);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// El botón Recargar Auditoría necesita estar en window para el onclick en HTML
document.getElementById('reloadAuditBtn')?.addEventListener('click', () => {
    if (appState.currentView === 'auditoria') {
        loadAuditLog();
    }
});
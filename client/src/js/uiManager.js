/**
 * UI Manager Module
 * Funciones reutilizables para renderizar UIcomponentes
 * Mantiene separación entre lógica y presentación
 */

/**
 * Muestra un toast notification
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'info'
 * @param {number} duration - Duración en ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Muestra un loading spinner
 * @returns {HTMLElement} Elemento del spinner
 */
export function createSpinner() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = '<div class="spinner"></div><p>Cargando...</p>';
    return loading;
}

/**
 * Renderiza un mensaje de estado vacío
 * @param {string} message - Mensaje a mostrar
 * @returns {HTMLElement} Elemento vacío
 */
export function createEmptyState(message = 'Sin datos') {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<p>${message}</p>`;
    return empty;
}

/**
 * Renderiza una tabla desde datos JSON
 * @param {array} data - Array de objetos
 * @param {array} columns - Columnas a mostrar [{ key: 'id', label: 'ID', type: 'text', actions: [] }]
 * @returns {HTMLElement} Tabla HTML
 */
export function createTable(data, columns) {
    const table = document.createElement('table');
    table.className = 'data-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.label;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    (data || []).forEach(row => {
        const tr = document.createElement('tr');
        columns.forEach(col => {
            const td = document.createElement('td');

            if (col.type === 'action') {
                // Botones de acción
                col.actions.forEach(action => {
                    const btn = document.createElement('button');
                    btn.className = `btn btn-${action.variant || 'secondary'}`;
                    btn.textContent = action.label;
                    btn.onclick = (e) => {
                        e.preventDefault();
                        action.handler(row);
                    };
                    td.appendChild(btn);
                    if (col.actions.indexOf(action) < col.actions.length - 1) {
                        td.appendChild(document.createTextNode(' '));
                    }
                });
            } else if (col.type === 'badge') {
                // Badge de estado
                const badge = document.createElement('span');
                badge.className = `badge badge-${row[col.key] ? 'success' : 'warning'}`;
                badge.textContent = row[col.key];
                td.appendChild(badge);
            } else if (col.type === 'currency') {
                // Formato moneda
                td.textContent = `$${parseFloat(row[col.key] || 0).toFixed(2)}`;
                td.style.fontWeight = '500';
            } else if (col.type === 'date') {
                // Formato fecha
                const date = new Date(row[col.key]);
                td.textContent = date.toLocaleDateString('es-ES');
            } else {
                // Texto normal
                td.textContent = row[col.key] || '-';
                if (col.variant === 'strong') {
                    td.style.fontWeight = 'bold';
                }
            }

            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

/**
 * Renderiza tarjetas de estadísticas
 * @param {object} stats - { label: 'Productos', value: 123, icon: '📦' }
 * @returns {HTMLElement} Contenedor de tarjetas
 */
export function createStatsCards(stats) {
    const container = document.createElement('div');
    container.className = 'stats';

    Object.entries(stats).forEach(([key, stat]) => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <h4>${stat.icon} ${stat.label}</h4>
            <div class="value">${typeof stat.value === 'number' && stat.value > 100 ? stat.value.toFixed(2) : stat.value}</div>
        `;
        container.appendChild(card);
    });

    return container;
}

/**
 * Renderiza un carrito de compras desde un array
 * @param {array} items - Items del carrito
 * @param {function} onRemove - Callback al eliminar
 * @param {function} onCheckout - Callback al completar
 * @returns {HTMLElement} Contenedor del carrito
 */
export function createCart(items, onRemove, onCheckout) {
    const container = document.createElement('div');

    if (items.length === 0) {
        container.appendChild(createEmptyState('El carrito está vacío'));
        return container;
    }

    const itemsDiv = document.createElement('div');
    items.forEach((item, idx) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div>
                <strong>${item.customer_email}</strong> - ${item.sku} x${item.quantity}
                <button class="btn btn-danger" index="${idx}">Eliminar</button>
            </div>
        `;
        cartItem.querySelector('button').onclick = () => onRemove(idx);
        itemsDiv.appendChild(cartItem);
    });
    container.appendChild(itemsDiv);

    // Total y botones
    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.textAlign = 'right';
    footer.innerHTML = `
        <h4>Items en carrito: <strong>${items.length}</strong></h4>
    `;
    
    const checkoutBtn = document.createElement('button');
    checkoutBtn.className = 'btn btn-primary';
    checkoutBtn.textContent = 'Completar Venta';
    checkoutBtn.onclick = onCheckout;
    footer.appendChild(checkoutBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary';
    clearBtn.textContent = 'Limpiar Carrito';
    clearBtn.style.marginLeft = '10px';
    clearBtn.onclick = () => {
        // Necesita ser manejado desde app.js
        container.innerHTML = '';
        container.appendChild(createEmptyState('El carrito está vacío'));
    };
    footer.appendChild(clearBtn);

    container.appendChild(footer);
    return container;
}

/**
 * Formatea un JSON para mostrar detalles
 * @param {object} obj - Objeto a formatear
 * @returns {HTMLElement} Contenedor formateado
 */
export function createDetailView(obj) {
    const container = document.createElement('div');
    container.className = 'detail-view';

    Object.entries(obj).forEach(([key, value]) => {
        const item = document.createElement('p');
        item.innerHTML = `<strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}`;
        container.appendChild(item);
    });

    return container;
}

/**
 * Entra el contenido de un contenedor y lo reemplaza
 * @param {HTMLElement} container - Contenedor a limpiar
 */
export function clearContainer(container) {
    container.innerHTML = '';
}

/**
 * Desactiva un formulario mientras se envía
 * @param {HTMLElement} form - Formulario
 * @param {boolean} disabled - Desactivar o no
 */
export function setFormDisabled(form, disabled) {
    const inputs = form.querySelectorAll('input, select, textarea, button');
    inputs.forEach(input => {
        input.disabled = disabled;
    });
}
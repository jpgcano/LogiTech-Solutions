-- BI Views for LogiTech Solutions
-- ------------------------------------------------------------
-- Archivo: script/bi_views.sql
-- Propósito: Vistas SQL para consultas BI usadas por el equipo
-- Notas: los nombres de las vistas son explícitos y facilitan su uso
--       en reportes y procedimientos almacenados.
-- ------------------------------------------------------------

/*
  suppliers_inventory_summary_view:
  - Resumen por proveedor: número de SKUs suministrados, cantidad total
    y valor total del inventario asociado al proveedor.
  - Útil para ver qué proveedores aportan mayor inventario/valor.
*/
CREATE OR REPLACE VIEW suppliers_inventory_summary_view AS
SELECT
  s.supplier_id,
  s.supplier_name,
  s.supplier_email,
  COUNT(DISTINCT ps.product_sku) AS total_items_supplied,
  COALESCE(SUM(ps.quantity),0) AS total_quantity,
  COALESCE(SUM(ps.total_line_value),0) AS total_inventory_value
FROM supplier s
LEFT JOIN product_supplier ps ON s.supplier_id = ps.supplier_id
GROUP BY s.supplier_id, s.supplier_name, s.supplier_email;


/*
  products_revenue_by_category_view:
  - Muestra para cada producto (dentro de su categoría) métricas de venta:
    veces vendido, cantidad total y revenue total.
  - Se usa para identificar "productos estrella" por categoría.
*/
CREATE OR REPLACE VIEW products_revenue_by_category_view AS
SELECT
  p.product_sku,
  p.product_name,
  c.category_name,
  COUNT(sp.sale) AS times_sold,
  COALESCE(SUM(sp.amount),0) AS total_quantity_sold,
  COALESCE(SUM(sp.sub_total),0) AS total_revenue
FROM product p
LEFT JOIN category c ON p.product_category = c.category_id
LEFT JOIN sale_product sp ON p.product_sku = sp.product_sku
GROUP BY p.product_sku, p.product_name, c.category_name;


/*
  customer_transaction_lines_view:
  - Descompone las transacciones por líneas (una fila por línea de venta)
  - Incluye customer_email para filtrar el historial por cliente.
  - Ideal para reconstruir el historial de compras a nivel de línea.
*/
CREATE OR REPLACE VIEW customer_transaction_lines_view AS
SELECT
  cu.customer_id,
  cu.customer_email,
  cu.customer_name,
  sa.transaction_id AS transaction_id,
  sa.datesale,
  sp.product_sku,
  p.product_name,
  sp.amount AS quantity,
  p.unit_price,
  sp.sub_total AS line_total
FROM customer cu
JOIN sale sa ON cu.customer_id = sa.customer
JOIN sale_product sp ON sa.transaction_id = sp.sale
LEFT JOIN product p ON sp.product_sku = p.product_sku
ORDER BY cu.customer_id, sa.datesale DESC;

/*
  customer_totals_view:
  - Resumen por cliente: número de transacciones, cantidad total de items, gasto total
  - Incluye customer_email para identificación
  - Útil para segmentación de clientes por valor y actividad
*/
CREATE OR REPLACE VIEW customer_totals_view AS
SELECT
  cu.customer_id,
  cu.customer_email,
  cu.customer_name,
  COUNT(DISTINCT sa.transaction_id) AS total_transactions,
  COALESCE(SUM(sp.amount), 0) AS total_items_purchased,
  COALESCE(SUM(sa.total), 0) AS total_spent
FROM customer cu
LEFT JOIN sale sa ON cu.customer_id = sa.customer
LEFT JOIN sale_product sp ON sa.transaction_id = sp.sale
GROUP BY cu.customer_id, cu.customer_email, cu.customer_name
ORDER BY total_spent DESC;

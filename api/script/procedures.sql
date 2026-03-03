-- Example stored procedures for reporting
-- ------------------------------------------------------------
-- Archivo: script/procedures.sql
-- Propósito: Procedimientos almacenados (SP) que exponen consultas BI
-- Comentarios: prefijo `sp_` para identificar procedures reutilizables
-- ------------------------------------------------------------

-- Suppliers summary procedure
CREATE OR REPLACE FUNCTION sp_get_suppliers_inventory_summary()
RETURNS TABLE(
  supplier_id INT,
  supplier_name TEXT,
  supplier_email TEXT,
  total_items_supplied BIGINT,
  total_quantity BIGINT,
  total_inventory_value NUMERIC
) AS $$
  SELECT supplier_id, supplier_name, supplier_email, total_items_supplied, total_quantity, total_inventory_value
  FROM suppliers_inventory_summary_view
  ORDER BY total_inventory_value DESC;
$$ LANGUAGE sql STABLE;

-- Top products by category
CREATE OR REPLACE FUNCTION sp_get_products_revenue_by_category(cat TEXT)
RETURNS TABLE(
  product_sku TEXT,
  product_name TEXT,
  category_name TEXT,
  times_sold BIGINT,
  total_quantity_sold BIGINT,
  total_revenue NUMERIC
) AS $$
  SELECT product_sku, product_name, category_name, times_sold, total_quantity_sold, total_revenue
  FROM products_revenue_by_category_view
  WHERE category_name = cat
  ORDER BY total_revenue DESC;
$$ LANGUAGE sql STABLE;

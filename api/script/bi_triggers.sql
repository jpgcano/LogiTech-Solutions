-- ------------------------------------------------------------
-- Archivo: script/bi_triggers.sql
-- Propósito: funciones y triggers para mantener totales derivados
-- Notas: se recomiendan para asegurar consistencia inmediata; para
--       alta carga, considerar mover cálculos pesados a jobs en background.
-- ------------------------------------------------------------

/*
  fn_update_sale_total_from_lines:
  - Recalcula el campo `sale.total` sumando los `sub_total` de `sale_product`.
  - Se ejecuta tras INSERT/UPDATE/DELETE en `sale_product`.
*/
CREATE OR REPLACE FUNCTION fn_update_sale_total_from_lines() RETURNS trigger AS $$
DECLARE
  sale_id VARCHAR(30);
BEGIN
  -- Determinar cuál sale_id actualizar según la operación
  IF TG_OP = 'DELETE' THEN
    sale_id := OLD.sale;
  ELSE
    sale_id := NEW.sale;
  END IF;

  -- Recalcular total para esa venta
  UPDATE sale
  SET total = (
    SELECT COALESCE(SUM(sub_total), 0) FROM sale_product WHERE sale = sale_id
  )
  WHERE transaction_id = sale_id;

  -- Retornar el registro apropiado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sale_total_after_insert ON sale_product;
CREATE TRIGGER trg_update_sale_total_after_insert
AFTER INSERT ON sale_product
FOR EACH ROW EXECUTE FUNCTION fn_update_sale_total_from_lines();

DROP TRIGGER IF EXISTS trg_update_sale_total_after_update ON sale_product;
CREATE TRIGGER trg_update_sale_total_after_update
AFTER UPDATE ON sale_product
FOR EACH ROW EXECUTE FUNCTION fn_update_sale_total_from_lines();

DROP TRIGGER IF EXISTS trg_update_sale_total_after_delete ON sale_product;
CREATE TRIGGER trg_update_sale_total_after_delete
AFTER DELETE ON sale_product
FOR EACH ROW EXECUTE FUNCTION fn_update_sale_total_from_lines();


/*
  fn_update_product_supplier_total_value:
  - Mantiene `product_supplier.total_line_value` como quantity * unit_price.
  - Se ejecuta tras INSERT y tras UPDATE de `quantity` en `product_supplier`.
*/
CREATE OR REPLACE FUNCTION fn_update_product_supplier_total_value() RETURNS trigger AS $$
BEGIN
  UPDATE product_supplier ps
  SET total_line_value = ps.quantity * COALESCE(p.unit_price, 0)
  FROM product p
  WHERE ps.product_sku = p.product_sku AND ps.product_sku = COALESCE(NEW.product_sku, OLD.product_sku);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_product_supplier_after_insert ON product_supplier;
CREATE TRIGGER trg_update_product_supplier_after_insert
AFTER INSERT ON product_supplier
FOR EACH ROW EXECUTE FUNCTION fn_update_product_supplier_total_value();

DROP TRIGGER IF EXISTS trg_update_product_supplier_after_update ON product_supplier;
CREATE TRIGGER trg_update_product_supplier_after_update
AFTER UPDATE OF quantity ON product_supplier
FOR EACH ROW EXECUTE FUNCTION fn_update_product_supplier_total_value();


/*
  fn_decrease_stock_on_sale:
  - Descuenta el stock de product_supplier cuando se realiza una venta.
  - Valida que haya suficiente existencia antes de restar.
  - Se ejecuta tras INSERT en sale_product.
*/
CREATE OR REPLACE FUNCTION fn_decrease_stock_on_sale() RETURNS trigger AS $$
DECLARE
  current_stock INT;
BEGIN
  -- Obtener stock actual del producto
  SELECT COALESCE(SUM(quantity), 0) INTO current_stock
  FROM product_supplier
  WHERE product_sku = NEW.product_sku;

  -- Validar que hay existencia suficiente
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product %: %  available, % requested',
      NEW.product_sku, current_stock, NEW.quantity;
  END IF;

  -- Decrementar stock (toma el primer proveedor disponible)
  UPDATE product_supplier
  SET quantity = quantity - NEW.quantity
  WHERE product_sku = NEW.product_sku
    AND quantity >= NEW.quantity
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decrease_stock_after_insert ON sale_product;
CREATE TRIGGER trg_decrease_stock_after_insert
AFTER INSERT ON sale_product
FOR EACH ROW EXECUTE FUNCTION fn_decrease_stock_on_sale();

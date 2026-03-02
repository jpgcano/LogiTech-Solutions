
CREATE TABLE IF NOT EXISTS city (
    city_Id int  PRIMARY key,
    specialty VARCHAR(100) NOT NULL
);

create table if not exists supplier(
 supplier_id int primary key,
 supplier_name varchar(30),
 supplier_email varchar(30)

);
create table if not exists category(
category_id int primary key,
category_name varchar(50)
);

create table if not exists product(
product_sku varchar(30) primary key,
product_name varchar(100),
product_category int references  category(category_id),
unit_price decimal(10,3)

);

create table if not exists product_supplier(
id int primary key,
product_sku varchar(30) references product(product_sku),
supplier_id int references  supplier(supplier_id),
quantity int,
total_line_value decimal(10,3)
);

create table  if not exists customer(
	customer_id int primary key,
	customer_name varchar(30),
	customer_email varchar(30),
	customer_phone varchar(15),
	customer_address varchar(100),
	city int REFERENCES city (city_Id)
); 

create table if not exists sale(
transaction_id varchar(30) primary key,
datesale date,
customer int references customer(customer_id),
total decimal(10,3)
);
create table if not exists sale_procuct(
sale varchar(30) references sale(transaction_id),
product_sku varchar(30) references product(product_sku),
amount int,
sub_total decimal(10,3)

);

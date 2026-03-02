# LogiTech-Solutions

#### General Information

1. Introduction
You have joined the engineering team at LogiTech Solutions, a consulting firm specializing
in modernizing systems for retail and e-commerce.

One of their largest clients, the supply giant "MegaStore Global," is facing
an operational crisis. For years, they have managed all their inventory, sales, suppliers,
and customers in a single master Excel file.

The volume of data has grown so much that the file is unmanageable: there are price inconsistencies, duplicate customer addresses with spelling errors, and it is impossible
to know the actual stock in real time.

Your mission: To act as Data Architect and Backend Developer to migrate this
"legacy system" to a modern, scalable, and persistent architecture, exposing the
information through a REST API.

2. Objectives
The objective of this test is to evaluate your ability to:
1. Analyze and design: Take a flat and disorganized dataset and propose a suitable persistence architecture.

2. Model architecture: Design a database schema that eliminates unnecessary redundancies and ensures data integrity.

3. Persistence: Implement a relational SQL engine and a NoSQL engine.

4. Backend development: Build an API with Express.js for data management.

5. Business intelligence: Resolve complex information requirements using queries or aggregations.

6. Audit logging: Manage transaction logs in specific scenarios using MongoDB.

## Riwi Database Performance Test:

#### Start PostgreSQL Container
´´´
docker run --name slogitech_v2 -e POSTGRES_PASSWORD=123456 -d -p 5439:5432 postgres
´´´
#### Start MongoDB Container
´´´
docker run -d --name mongo_logitech_v2 -p 27018:27017 mongo
´´´

#### Start Server
´´´
pnpm run dev
´´´



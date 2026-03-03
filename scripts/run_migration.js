import postgresDB from '../src/config/postgres.js';
import mongoDB from '../src/config/mongo.js';
import MigrationService from '../src/services/MigrationService.js';
import DatabaseSetup from '../src/config/databaseSetup.js';

async function run(){
  try{
    console.log('Connecting to Postgres...');
    await postgresDB.connect();
    console.log('Initializing SQL schema...');
    await DatabaseSetup.initialize();
    console.log('Connecting to MongoDB...');
    await mongoDB.connect();

    console.log('Starting migration...');
    const result = await MigrationService.migrate(true);
    console.log('Migration result:', result);
    process.exit(0);
  }catch(err){
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();

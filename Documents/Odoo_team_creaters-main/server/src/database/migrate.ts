import { getDatabase, closeDatabase, createTables } from './schema';

async function migrate() {
  try {
    console.log('🔵 Starting database migration...');
    
    // Get a database connection
    const db = await getDatabase();
    
    console.log('🟢 Database connected. Running migrations...');
    
    // Create tables
    await createTables(db);
    
    console.log('✅ Database migration completed successfully!');
    
    // Close the database connection
    await closeDatabase();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrate().catch(console.error);

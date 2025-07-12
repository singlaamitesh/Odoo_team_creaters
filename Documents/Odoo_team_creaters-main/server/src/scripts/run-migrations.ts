#!/usr/bin/env node
import { getDatabase, closeDatabase } from '../database/schema.js';
import { MigrationRunner } from '../database/migration.js';
import { createRatingsTable } from '../database/migrations/001_create_ratings_table.js';

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  try {
    const db = await getDatabase();
    const migrationRunner = new MigrationRunner(db);
    
    // Register migrations
    migrationRunner.addMigration(createRatingsTable);
    
    // Run migrations
    await migrationRunner.migrate();
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigrations();

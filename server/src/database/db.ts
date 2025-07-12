import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { join } from 'path';

let db: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = new Promise(async (resolve, reject) => {
    try {
      const database = await open({
        filename: join(process.cwd(), 'skillswap.db'),
        driver: sqlite3.Database
      });

      // Enable foreign keys and WAL mode
      await database.run('PRAGMA foreign_keys = ON');
      await database.run('PRAGMA journal_mode = WAL');

      db = database;
      console.log('Database connected successfully');
      resolve(database);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      reject(error);
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  });

  return initPromise;
}

export function closeDatabase(callback?: (err: Error | null) => void): void {
  if (db) {
    db.close()
      .then(() => {
        console.log('Database connection closed');
        db = null;
        if (callback) callback(null);
      })
      .catch((err) => {
        console.error('Error closing database:', err);
        if (callback) callback(err);
      });
  } else if (callback) {
    process.nextTick(() => callback(null));
  }
}

// Initialize database when this module is imported
getDatabase().catch(err => {
  console.error('Error during database initialization:', err);
  process.exit(1);
});
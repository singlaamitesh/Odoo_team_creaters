import { Database } from 'sqlite';

export interface Migration {
  id: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

export class MigrationRunner {
  private migrations: Migration[] = [];
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async init() {
    // Create migrations table if it doesn't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  addMigration(migration: Migration) {
    this.migrations.push(migration);
  }

  async migrate() {
    await this.init();
    
    // Get all applied migrations
    const appliedMigrations = await this.db.all<{id: string}[]>(
      'SELECT id FROM migrations ORDER BY run_at ASC'
    );
    
    const appliedIds = new Set(appliedMigrations.map(m => m.id));
    const pendingMigrations = this.migrations.filter(m => !appliedIds.has(m.id));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to run');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration: ${migration.id}`);
      await this.db.run('BEGIN TRANSACTION');
      
      try {
        await migration.up(this.db);
        await this.db.run(
          'INSERT INTO migrations (id, name) VALUES (?, ?)',
          [migration.id, migration.id]
        );
        await this.db.run('COMMIT');
        console.log(`✅ Successfully applied migration: ${migration.id}`);
      } catch (error) {
        await this.db.run('ROLLBACK');
        console.error(`❌ Failed to apply migration ${migration.id}:`, error);
        throw error;
      }
    }
  }

  async rollback(steps: number = 1) {
    await this.init();
    
    const appliedMigrations = await this.db.all<{id: string}[]>(
      'SELECT id FROM migrations ORDER BY run_at DESC LIMIT ?',
      [steps]
    );
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    console.log(`Rolling back ${appliedMigrations.length} migrations`);
    
    for (const { id } of appliedMigrations) {
      const migration = this.migrations.find(m => m.id === id);
      if (!migration?.down) {
        console.log(`Skipping rollback for ${id} (no down migration)`);
        continue;
      }
      
      console.log(`Rolling back migration: ${id}`);
      await this.db.run('BEGIN TRANSACTION');
      
      try {
        await migration.down(this.db);
        await this.db.run('DELETE FROM migrations WHERE id = ?', [id]);
        await this.db.run('COMMIT');
        console.log(`✅ Successfully rolled back migration: ${id}`);
      } catch (error) {
        await this.db.run('ROLLBACK');
        console.error(`❌ Failed to rollback migration ${id}:`, error);
        throw error;
      }
    }
  }
}

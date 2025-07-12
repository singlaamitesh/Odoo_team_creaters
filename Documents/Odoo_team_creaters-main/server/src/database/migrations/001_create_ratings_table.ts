import { Database } from 'sqlite';

interface Migration {
  id: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

export const createRatingsTable: Migration = {
  id: '001_create_ratings_table',
  up: async (db: Database) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        raterId INTEGER NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (raterId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_ratings_updatedAt
      AFTER UPDATE ON ratings
      FOR EACH ROW
      BEGIN
        UPDATE ratings SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    await db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_userId ON ratings(userId)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_ratings_raterId ON ratings(raterId)');
  },
  down: async (db: Database) => {
    await db.exec('DROP TRIGGER IF EXISTS update_ratings_updatedAt');
    await db.exec('DROP TABLE IF EXISTS ratings');
  }
};

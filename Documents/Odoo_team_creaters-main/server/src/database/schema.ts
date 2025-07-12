import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { promisify } from 'util';
import { MigrationRunner } from './migration.js';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Type for database instance
type DB = Database<sqlite3.Database, sqlite3.Statement>;

// Promisify bcrypt functions
const hashAsync = promisify(bcrypt.hash);
const compareAsync = promisify(bcrypt.compare);

// Helper function to run database queries with error handling
const executeQuery = async <T>(
  db: DB,
  sql: string,
  params: any[] = []
): Promise<T | undefined> => {
  try {
    return await db.get<T>(sql, ...params);
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database query failed: ${error}`);
  }
};

// Helper function to run database commands with error handling
const executeCommand = async (
  db: DB,
  sql: string,
  params: any[] = []
): Promise<void> => {
  try {
    await db.run(sql, ...params);
  } catch (error) {
    console.error('Database command error:', error);
    throw new Error(`Database command failed: ${error}`);
  }
};

// Helper function to execute multiple SQL statements
const executeStatements = async (
  db: DB,
  statements: string[]
): Promise<void> => {
  for (const statement of statements) {
    try {
      await db.exec(statement);
    } catch (error) {
      console.error('Error executing statement:', statement);
      throw error;
    }
  }
};

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  location?: string;
  profilePicture?: string;
  rating?: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: number;
  userId: number;
  name: string;
  description: string;
  category: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isOffering: boolean;
  isSeeking: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequest {
  id: number;
  requesterId: number;
  skillOfferedId: number;
  skillRequestedId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  message?: string;
  proposedTime?: string;
  proposedLocation?: string;
  completedAt?: string;
  ratingByRequester?: number;
  ratingByReceiver?: number;
  feedbackByRequester?: string;
  feedbackByReceiver?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields that might be joined from other tables
  requesterName?: string;
  providerName?: string;
  requesterPhoto?: string;
  providerPhoto?: string;
  offeredSkillName?: string;
  wantedSkillName?: string;
  // Alias for backward compatibility
  offeredSkillId?: number;
  wantedSkillId?: number;
  providerId?: number; // This is derived from skillRequestedId
}

export interface Rating {
  id: number;
  swapId: number;
  raterId: number;
  ratedId: number;
  rating: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields that might be joined from other tables
  raterName?: string;
  raterPhoto?: string;
}

export interface Review {
  id: number;
  userId: number; // User being reviewed
  reviewerId: number; // User who wrote the review
  swapId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

let dbInstance: DB | null = null;

export async function getDatabase(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }
  
  const dbPath = join(process.cwd(), 'skillswap.db');
  
  try {
    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign key constraints
    await dbInstance.run('PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    await dbInstance.run('PRAGMA journal_mode = WAL');
    
    console.log(`✅ Database connected at ${dbPath}`);
    return dbInstance;
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
    console.log('✅ Database connection closed');
  }
}

export async function createTables(db: DB): Promise<void> {
  try {
    // Enable foreign keys
    await executeCommand(db, 'PRAGMA foreign_keys = ON');
    
    // Enable WAL mode for better concurrency
    await executeCommand(db, 'PRAGMA journal_mode = WAL');
    
    // Create tables without foreign key constraints first
    const tableStatements = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT NOT NULL,
        bio TEXT,
        location TEXT,
        profilePicture TEXT,
        rating REAL DEFAULT 0,
        isAdmin BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create triggers for updatedAt
      `CREATE TRIGGER IF NOT EXISTS update_users_updatedAt
      AFTER UPDATE ON users
      FOR EACH ROW
      BEGIN
        UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;`,

      // Skills table
      `CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        proficiency TEXT CHECK(proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')) NOT NULL,
        isOffering BOOLEAN DEFAULT 1,
        isSeeking BOOLEAN DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Create triggers for skills updatedAt
      `CREATE TRIGGER IF NOT EXISTS update_skills_updatedAt
      AFTER UPDATE ON skills
      FOR EACH ROW
      BEGIN
        UPDATE skills SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;`,

      // Swap requests table
      `CREATE TABLE IF NOT EXISTS swap_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requesterId INTEGER NOT NULL,
        skillOfferedId INTEGER NOT NULL,
        skillRequestedId INTEGER NOT NULL,
        status TEXT CHECK(status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')) DEFAULT 'pending',
        message TEXT,
        proposedTime DATETIME,
        proposedLocation TEXT,
        completedAt DATETIME,
        ratingByRequester INTEGER,
        ratingByReceiver INTEGER,
        feedbackByRequester TEXT,
        feedbackByReceiver TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (skillOfferedId) REFERENCES skills(id) ON DELETE CASCADE,
        FOREIGN KEY (skillRequestedId) REFERENCES skills(id) ON DELETE CASCADE
      )`,

      // Create triggers for swap_requests updatedAt
      `CREATE TRIGGER IF NOT EXISTS update_swap_requests_updatedAt
      AFTER UPDATE ON swap_requests
      FOR EACH ROW
      BEGIN
        UPDATE swap_requests SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;`,

      // Reviews table
      `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        reviewerId INTEGER NOT NULL,
        swapId INTEGER NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewerId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (swapId) REFERENCES swap_requests(id) ON DELETE CASCADE
      )`,

      // Create triggers for reviews updatedAt
      `CREATE TRIGGER IF NOT EXISTS update_reviews_updatedAt
      AFTER UPDATE ON reviews
      FOR EACH ROW
      BEGIN
        UPDATE reviews SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;`,

      // Create indexes for better query performance
      'CREATE INDEX IF NOT EXISTS idx_skills_userId ON skills(userId)',
      'CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category)',
      'CREATE INDEX IF NOT EXISTS idx_swap_requests_requesterId ON swap_requests(requesterId)',
      'CREATE INDEX IF NOT EXISTS idx_swap_requests_skillOfferedId ON swap_requests(skillOfferedId)',
      'CREATE INDEX IF NOT EXISTS idx_swap_requests_skillRequestedId ON swap_requests(skillRequestedId)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_userId ON reviews(userId)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_reviewerId ON reviews(reviewerId)'
    ];
    
    // Execute all table and index creation statements
    await executeStatements(db, tableStatements);

    // Run migrations
    const migrationRunner = new MigrationRunner(db);
    
    // Dynamically import all migrations
    try {
      // Import the ratings table migration
      const { createRatingsTable } = await import('./migrations/001_create_ratings_table.js');
      migrationRunner.addMigration(createRatingsTable);
      
      // Run migrations
      await migrationRunner.migrate();
      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
    
    // Check if admin user exists, if not create one
    const adminUser = await executeQuery<User>(
      db,
      'SELECT * FROM users WHERE isAdmin = 1 LIMIT 1'
    );
    
    if (!adminUser) {
      const hashedPassword = await hashAsync('admin123', 10);
      await executeCommand(
        db,
        'INSERT INTO users (username, email, password, fullName, isAdmin) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@skillsawp.com', hashedPassword, 'Administrator', 1]
      );
      console.log('✅ Default admin user created');
    }

    console.log('✅ Database tables and indexes created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}
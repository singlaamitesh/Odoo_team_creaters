# Database Setup for SkillSwap

This directory contains the database schema and seed data for the SkillSwap application.

## Files

- `init.sql` - Contains the complete database schema with all tables, indexes, and triggers.
- `seed.sql` - Contains sample data for development and testing.
- `README.md` - This file.

## Setup Instructions

### Prerequisites

- SQLite3 (should be pre-installed on most Unix-based systems)
- Node.js (for running the application)

### Initializing the Database

1. Navigate to the project root directory:
   ```bash
   cd /path/to/your/project
   ```

2. Create a new SQLite database file (if it doesn't exist):
   ```bash
   touch server/skillswap.db
   ```

3. Initialize the database schema:
   ```bash
   sqlite3 server/skillswap.db < database/init.sql
   ```

4. (Optional) Load sample data:
   ```bash
   sqlite3 server/skillswap.db < database/seed.sql
   ```

### Verifying the Database

You can verify the database was created correctly by running:

```bash
sqlite3 server/skillswap.db ".tables"
sqlite3 server/skillswap.db "SELECT * FROM users;"
```

## Database Schema

The database consists of the following tables:

1. `users` - Stores user account information
2. `skills` - Stores skills that users are offering or seeking
3. `swap_requests` - Tracks skill swap requests between users
4. `reviews` - Stores reviews for completed skill swaps
5. `ratings` - Stores user ratings
6. `migrations` - Tracks database migrations

## Resetting the Database

To reset the database to its initial state:

```bash
rm server/skillswap.db
touch server/skillswap.db
sqlite3 server/skillswap.db < database/init.sql
sqlite3 server/skillswap.db < database/seed.sql  # Optional
```

## Notes

- The database file (`skillswap.db`) is included in `.gitignore` and should not be committed to version control.
- Always back up your database before making schema changes.
- For production, consider using a more robust database system like PostgreSQL or MySQL.

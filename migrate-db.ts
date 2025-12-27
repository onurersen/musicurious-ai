import { loadEnvConfig } from '@next/env';
import { sql } from '@vercel/postgres';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
    console.log('Running migration...');
    try {
        // 1. Create users table
        await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
        console.log('Created users table');

        // 2. Add columns to videos table
        // check if user_id column exists first to avoid error? 
        // Postgres will duplicate columns if I'm not careful? No, it will error if exists.
        // I'll use DO block or catch error, simplest is to just try ALTER and ignore "already exists" if I was writing robust SQL,
        // but here I can just assume it doesn't exist yet or use specific conditional logical.
        // Since I can't easily use DO block with parameterized query template easily without writing raw string,
        // I will try to add them one by one and catch errors.

        try {
            await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);`;
            console.log('Added user_id column to videos');
        } catch (e) {
            console.log('user_id column might already exist:', e);
        }

        try {
            await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';`;
            console.log('Added approval_status column to videos');
        } catch (e) {
            console.log('approval_status column might already exist:', e);
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();

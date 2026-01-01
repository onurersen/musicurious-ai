
import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
    console.log('Starting user management migration...');
    try {
        // 1. Add status column to users if it doesn't exist
        // We use a safe check. Vercel Postgres doesn't strictly support IF NOT EXISTS on ADD COLUMN in older versions, 
        // but let's try strict approach handling error or just assuming it works for standard PG.
        // Actually, best "idempotent" way safely is just try/catch block for the column
        try {
            await sql`ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'pending'`;
            console.log("Added status column to users.");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                console.log("Status column already exists.");
            } else {
                console.error("Error adding status column:", e);
            }
        }

        // 2. Create banned_emails table
        await sql`
            CREATE TABLE IF NOT EXISTS banned_emails (
                email TEXT PRIMARY KEY,
                banned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                reason TEXT
            )
        `;
        console.log("Created banned_emails table.");

        // 3. Set 'onurersen@gmail.com' to 'approved' explicitly to ensure admin access
        // We'll also set all currently existing users to 'approved' so we don't lock out current testers.
        // Future users will be 'pending' by default.
        await sql`UPDATE users SET status = 'approved' WHERE status IS NULL OR status = 'pending'`; // Initial backfill

        console.log("Migration complete.");
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();

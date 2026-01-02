import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { sql } from '@vercel/postgres';

async function migrate() {
    try {
        console.log('Adding added_chords column to extracted_sections table...');
        await sql`ALTER TABLE extracted_sections ADD COLUMN IF NOT EXISTS added_chords JSONB DEFAULT '[]'::jsonb`;
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();

import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function migrate() {
    try {
        console.log('Adding chord_adjustments column to extracted_sections table...');

        // Use try/catch for "IF NOT EXISTS" like safety if needed, 
        // but ADD COLUMN IF NOT EXISTS is standard PG 9.6+ supported by Vercel usually.
        // If it fails, we catch it.
        await sql`
            ALTER TABLE extracted_sections 
            ADD COLUMN IF NOT EXISTS chord_adjustments JSONB DEFAULT '{}'::jsonb;
        `;

        console.log('Migration completed successfully.');
    } catch (e: any) {
        if (e.message.includes('already exists')) {
            console.log('Column already exists (caught via error).');
        } else {
            console.error('Migration failed:', e);
        }
    }
}

migrate();

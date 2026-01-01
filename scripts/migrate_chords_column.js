/* eslint-disable @typescript-eslint/no-require-imports */
const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
    try {
        console.log('Migrating database: Adding chords and time_signature columns...');

        await sql`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS chords JSONB DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS time_signature TEXT DEFAULT '4/4';
        `;

        console.log('Migration complete: Added chords and time_signature to videos table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();

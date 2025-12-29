const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function run() {
    try {
        console.log('Migrating database...');

        // Check columns individually to be safe
        await sql`
            ALTER TABLE videos 
            ADD COLUMN IF NOT EXISTS bpm NUMERIC,
            ADD COLUMN IF NOT EXISTS key_tonic TEXT,
            ADD COLUMN IF NOT EXISTS key_scale TEXT;
        `;

        console.log('Migration complete: Added bpm, key_tonic, key_scale to videos table.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();

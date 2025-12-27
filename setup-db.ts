import { createVideosTable, createStemsTable } from './src/lib/schema';
import { sql } from '@vercel/postgres';

async function main() {
    console.log('Setting up database...');
    try {
        await createVideosTable();
        await createStemsTable();
        console.log('Database setup completed successfully.');
    } catch (err) {
        console.error('Database setup failed:', err);
    }
}

main();

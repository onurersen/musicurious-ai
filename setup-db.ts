import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { createVideosTable, createStemsTable, createUserJamSettingsTable } from './src/lib/schema';
import { sql } from '@vercel/postgres';

async function main() {
    console.log('Setting up database...');
    try {
        await createVideosTable();
        await createStemsTable();
        await createUserJamSettingsTable();
        console.log('Database setup completed successfully.');
    } catch (err) {
        console.error('Database setup failed:', err);
    }
}

main();

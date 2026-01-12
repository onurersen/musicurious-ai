import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

import { createVideosTable, createStemsTable, createUserJamSettingsTable, createExtractedSectionsTable, createMusicalFlowCanvasesTable, createSavedJamsTable, createAuditLogsTable } from './src/lib/schema';
import { sql } from '@vercel/postgres';

async function main() {
    console.log('Setting up database...');
    try {
        await createVideosTable();
        await createStemsTable();
        await createUserJamSettingsTable();
        await createExtractedSectionsTable();
        await createMusicalFlowCanvasesTable();
        await createSavedJamsTable();
        await createAuditLogsTable();
        console.log('Database setup completed successfully.');
    } catch (err) {
        console.error('Database setup failed:', err);
    }
}

main();

import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function main() {
    try {
        await sql`TRUNCATE TABLE musical_flow_canvases;`;
        console.log('Successfully truncated musical_flow_canvases table.');
    } catch (err) {
        console.error('Error truncating table:', err);
    }
}

main();

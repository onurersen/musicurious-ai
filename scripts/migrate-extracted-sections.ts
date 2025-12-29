
import { createExtractedSectionsTable } from '../src/lib/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Running migration: Create Extracted Sections Table...');
    try {
        await createExtractedSectionsTable();
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();

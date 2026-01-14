/* eslint-disable @typescript-eslint/no-require-imports */
const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkStatus() {
    try {
        const res = await sql`SELECT id, title, status, processing_status, processing_progress FROM videos WHERE title ILIKE '%Blunt%'`;
        console.log("Video Status:", res.rows);
    } catch (e) {
        console.error(e);
    }
}

checkStatus();

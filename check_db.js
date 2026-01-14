/* eslint-disable @typescript-eslint/no-require-imports */
const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function check() {
    try {
        const res = await sql`SELECT id, title, user_id, approval_status, status FROM videos WHERE title ILIKE '%Dark%' OR title ILIKE '%Blunt%'`;
        console.log("Found videos:", res.rows);

        // Also check total count
        const count = await sql`SELECT COUNT(*) FROM videos`;
        console.log("Total videos count:", count.rows[0].count);
    } catch (e) {
        console.error(e);
    }
}

check();

const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function checkUser() {
    try {
        const userId = 'user_37klFgXL5QxNUqClyj8PwMjg2C1';
        const res = await sql`SELECT * FROM users WHERE id = ${userId}`;
        console.log("Found user:", res.rows);
    } catch (e) {
        console.error(e);
    }
}

checkUser();

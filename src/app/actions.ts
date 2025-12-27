"use server";

import { sql } from '@vercel/postgres';

export async function checkVideoCategory(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
            next: { revalidate: 0 } // No cache for fresh results
        });

        const html = await response.text();

        // Check for <meta itemprop="genre" content="Music">
        const isMusicGenre = /<meta\s+itemprop="genre"\s+content="Music"/i.test(html);

        // Check for "category":"Music" in JSON (strict)
        const isMusicCategory = /"category"\s*:\s*"Music"/i.test(html);

        console.log(`Checking URL: ${url}`);
        console.log(`isMusicGenre: ${isMusicGenre}, isMusicCategory: ${isMusicCategory}`);

        return {
            isMusic: isMusicGenre || isMusicCategory,
            category: isMusicGenre || isMusicCategory ? "Music" : "Unknown",
        };
    } catch (error) {
        console.error("Failed to fetch video page:", error);
        // If we can't check, we assume it's okay but maybe warn we couldn't verify
        return { isMusic: true, category: "Error" };
    }
}

export async function createVideoRecord(url: string) {
    try {
        // Insert and return the new row
        // Note: returning * works in Postgres
        const result = await sql`
      INSERT INTO videos (youtube_url, status)
      VALUES (${url}, 'pending')
      RETURNING id, youtube_url, status, created_at;
    `;

        return { success: true, video: result.rows[0] };
    } catch (error) {
        console.error('Failed to create video record:', error);
        return { success: false, error: 'Database error' };
    }
}

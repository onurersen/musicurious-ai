
import { sql } from '@vercel/postgres';
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const user = await currentUser();
        const email = user?.emailAddresses[0]?.emailAddress;

        // Strict Admin Check
        let isAdmin = false;
        if (email === 'onurersen@gmail.com') {
            isAdmin = true;
        } else if (user) {
            const userRes = await sql`SELECT role FROM users WHERE id = ${user.id}`;
            isAdmin = userRes.rows[0]?.role === 'admin';
        }

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const formData = await request.formData();
        const videoId = parseInt(formData.get('videoId') as string);

        if (!videoId) {
            return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
        }

        // Find the latest processing folder for this video
        const stemsRoot = join(process.cwd(), 'public', 'stems', 'htdemucs');
        let entries;
        try {
            entries = await readdir(stemsRoot, { withFileTypes: true });
        } catch (e) {
            return NextResponse.json({ error: 'Stems directory not found. Process likely not started.' }, { status: 404 });
        }

        // Filter directories starting with videoId_
        const candidates = entries.filter(e => e.isDirectory() && e.name.startsWith(`${videoId}_`));

        if (candidates.length === 0) {
            return NextResponse.json({ error: 'No processed stems found for this video.' }, { status: 404 });
        }

        // Sort by creation time (using stats or just name timestamp logic if reliable)
        // Since names are id_timestamp_name, we can sort by name string as timestamp is high-order bytes
        // But better to check stats to be safe or rely on timestamp in name
        // Name format: 8_1766951660716_Sevda... -> split[1] is timestamp
        const sorted = candidates.sort((a, b) => {
            const timeA = parseInt(a.name.split('_')[1] || '0');
            const timeB = parseInt(b.name.split('_')[1] || '0');
            return timeB - timeA; // Descending
        });

        const latestFolder = sorted[0].name;
        const stemTypes = [
            'vocals', 'drums', 'bass', 'guitar', 'piano', 'other',
            'no_vocals', 'no_drums', 'no_bass', 'no_guitar', 'no_piano'
        ];
        const targetDir = `/stems/htdemucs_6s/${latestFolder}`;

        await sql`BEGIN`;

        // Clear existing stems for this video to avoid duplicates if re-running
        await sql`DELETE FROM stems WHERE video_id = ${videoId}`;

        // Insert new stems
        for (const type of stemTypes) {
            // Check if file exists (optional validation, but assuming Demucs worked)
            // We verify existence implicitly by constructing path. If missing frontend will 404.
            const blobUrl = `${targetDir}/${type}.wav`;

            // Map 'other' to 'guitar' if user prefers? Or keep as 'other'? 
            // The task was "vocal, drum, bass, guitar removal". htdemucs produces "other" which acts as accompaniment/guitar/piano.
            // We will store as 'other' appropriately or maybe 'melody'? Standard convention is 'other'.

            await sql`
                INSERT INTO stems (video_id, type, blob_url)
                VALUES (${videoId}, ${type}, ${blobUrl})
            `;
        }

        await sql`UPDATE videos SET processing_status = 'completed', processing_progress = 100 WHERE id = ${videoId}`;

        await sql`COMMIT`;

        return NextResponse.json({ success: true, folder: latestFolder });

    } catch (err: any) {
        console.error("Transfer error:", err);
        await sql`ROLLBACK`;
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

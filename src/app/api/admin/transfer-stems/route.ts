
import { sql } from '@vercel/postgres';
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { readdir, readFile, rm, appendFile } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';

const logFile = join(process.cwd(), 'transfer-debug.log');
const log = async (msg: string) => {
    const time = new Date().toISOString();
    await appendFile(logFile, `[${time}] ${msg}\n`).catch(() => { });
    console.log(msg); // Keep console just in case
};

export async function POST(request: Request) {
    await log("[Transfer API] Request received");
    // STRICTLY LOCAL ONLY
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Stem transfer is disabled in production.' }, { status: 403 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;

    // Strict Admin Check
    let isAdmin = false;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    if (adminEmail && email === adminEmail) {
        isAdmin = true;
    } else if (user) {
        const userRes = await sql`SELECT role FROM users WHERE id = ${user.id}`;
        isAdmin = userRes.rows[0]?.role === 'admin';
    }

    if (!isAdmin) {
        await log(`[Transfer API] Unauthorized access attempt by: ${email}`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: "Transfer stems is only available in local development" }, { status: 403 });
    }

    const formData = await request.formData();
    const videoId = parseInt(formData.get('videoId') as string);

    if (!videoId) {
        return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    // Find the latest processing folder for this video (MP3s in htdemucs)
    const stemsRoot = join(process.cwd(), 'public', 'stems', 'htdemucs');
    let entries;
    try {
        entries = await readdir(stemsRoot, { withFileTypes: true });
        await log(`[Transfer API] Found ${entries.length} entries in htdemucs`);
    } catch (e: any) {
        await log(`[Transfer API] htdemucs directory not found: ${e.message}`);
        return NextResponse.json({ error: 'Stems directory (htdemucs) not found. Process likely not started.' }, { status: 404 });
    }

    // Filter directories starting with videoId_
    const candidates = entries.filter(e => e.isDirectory() && e.name.startsWith(`${videoId}_`));
    await log(`[Transfer API] Found ${candidates.length} candidate folders for video ${videoId}`);

    if (candidates.length === 0) {
        await log(`[Transfer API] No processed stems found for video ${videoId}`);
        return NextResponse.json({ error: 'No processed stems found for this video.' }, { status: 404 });
    }

    // Sort by creation time (descending)
    const sorted = candidates.sort((a, b) => {
        const timeA = parseInt(a.name.split('_')[1] || '0');
        const timeB = parseInt(b.name.split('_')[1] || '0');
        return timeB - timeA;
    });

    const latestFolder = sorted[0].name;
    const sourceDir = join(stemsRoot, latestFolder);

    // Prepare Streaming Response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                const send = (msg: string) => controller.enqueue(encoder.encode(msg + '\n'));

                send(JSON.stringify({ type: 'start', message: 'Starting upload...' }));

                // Get all MP3 files in the folder
                const folderEntries = await readdir(sourceDir, { withFileTypes: true });
                const mp3Files = folderEntries
                    .filter(e => e.isFile() && e.name.endsWith('.mp3'))
                    .map(e => e.name);

                const totalFiles = mp3Files.length;
                await log(`[Transfer API] Found ${totalFiles} MP3 files to transfer in ${latestFolder}`);

                // Transaction start
                await log(`[Transfer API] Starting DB transaction`);
                await sql`BEGIN`;
                await sql`DELETE FROM stems WHERE video_id = ${videoId}`;

                for (let i = 0; i < totalFiles; i++) {
                    const file = mp3Files[i];
                    await log("[Transfer API] Processing file " + (i + 1) + "/" + totalFiles + ": " + file);
                    const filePath = join(sourceDir, file);
                    const fileBuffer = await readFile(filePath);

                    // Upload to Vercel Blob
                    await log(`[Transfer API] Uploading ${file} to Vercel Blob...`);
                    const blob = await put(`submissions/${videoId}/${file}`, fileBuffer, {
                        access: 'public',
                        addRandomSuffix: false,
                        token: process.env.BLOB_READ_WRITE_TOKEN,
                        // @ts-ignore - allowOverwrite is valid but types might be old
                        allowOverwrite: true
                    });
                    await log(`[Transfer API] Uploaded ${file} to ${blob.url}`);

                    // Save to DB
                    await log(`[Transfer API] Inserting stem record for ${file}`);
                    await sql`
                        INSERT INTO stems (video_id, type, blob_url, created_at)
                        VALUES (${videoId}, ${file.replace('.mp3', '')}, ${blob.url}, NOW())
                    `;

                    // Report progress
                    const percent = Math.round(((i + 1) / totalFiles) * 100);
                    send(JSON.stringify({ type: 'progress', percent, message: `Uploaded ${file.replace('.mp3', '')}` }));
                }

                await log(`[Transfer API] All files processed. Committing...`);
                await sql`COMMIT`;
                await log(`[Transfer API] Transaction committed.`);

                // Cleanup
                await log(`[Transfer API] Cleaning up files...`);
                await sql`UPDATE videos SET processing_status = 'completed', processing_progress = 100 WHERE id = ${videoId}`;

                // Cleanup files
                await rm(sourceDir, { recursive: true, force: true });
                await log(`[Transfer API] Cleanup done. Sending success.`);

                send(JSON.stringify({ type: 'done', message: 'Transfer successful!' }));
                controller.close();
            } catch (err: any) {
                await log(`[Transfer API] Stream error: ${err.message}`);
                console.error("Stream error:", err);
                try { await sql`ROLLBACK`; } catch (e) { await log(`[Transfer API] Rollback failed: ${e}`); }
                controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: err.message }) + '\n'));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain',
            'Transfer-Encoding': 'chunked',
        },
    });
}


import { sql } from '@vercel/postgres';
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { readdir, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
    // STRICTLY LOCAL ONLY
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Stem transfer is disabled in production.' }, { status: 403 });
    }

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
    } catch {
        return NextResponse.json({ error: 'Stems directory (htdemucs) not found. Process likely not started.' }, { status: 404 });
    }

    // Filter directories starting with videoId_
    const candidates = entries.filter(e => e.isDirectory() && e.name.startsWith(`${videoId}_`));

    if (candidates.length === 0) {
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

                // Transaction start
                await sql`BEGIN`;
                await sql`DELETE FROM stems WHERE video_id = ${videoId}`;

                let completed = 0;

                for (const filename of mp3Files) {
                    const type = filename.replace('.mp3', '');
                    const filePath = join(sourceDir, filename);

                    try {
                        const fileBuffer = await readFile(filePath);

                        // Upload to Vercel Blob
                        // Path: submissions/<videoId>/<filename>
                        const blobPath = `submissions/${videoId}/${filename}`;
                        const blob = await put(blobPath, fileBuffer, {
                            access: 'public',
                            addRandomSuffix: false // Keep clean URLs so we can predict them if needed
                        });

                        // Insert into Stems table
                        await sql`
                            INSERT INTO stems (video_id, type, blob_url)
                            VALUES (${videoId}, ${type}, ${blob.url})
                        `;

                        completed++;
                        const progress = Math.round((completed / totalFiles) * 100);
                        send(JSON.stringify({ type: 'progress', percent: progress, message: `Uploaded ${type}` }));

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        console.error(`Failed to upload ${type}:`, e);
                        throw new Error(`Failed to upload ${type}: ${e.message}`);
                    }
                }

                await sql`UPDATE videos SET processing_status = 'completed', processing_progress = 100 WHERE id = ${videoId}`;
                await sql`COMMIT`;

                send(JSON.stringify({ type: 'complete', message: 'Transfer successful!' }));

                // Cleanup local files
                try {
                    await rm(sourceDir, { recursive: true, force: true });
                    send(JSON.stringify({ type: 'cleanup', message: 'Local files cleaned up.' }));
                } catch (cleanupErr) {
                    console.error("Cleanup failed:", cleanupErr);
                    // Don't fail the whole request, just log it
                }
                controller.close();

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (err: any) {
                console.error("Stream error:", err);
                await sql`ROLLBACK`; // Try to rollback if connection still open (might fail if concurrent)
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

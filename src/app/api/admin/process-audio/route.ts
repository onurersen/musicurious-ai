import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

// Helper to ensure directory exists
async function ensureDir(dir: string) {
    try {
        await mkdir(dir, { recursive: true });
    } catch (e) {
        // ignore if exists
    }
}

export async function POST(req: NextRequest) {
    try {
        // STRICTLY LOCAL ONLY
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Audio processing is disabled in production.' }, { status: 403 });
        }

        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.emailAddresses[0]?.emailAddress;
        if (email !== 'onurersen@gmail.com') { // Basic admin check or use DB role
            // Ideally fetch role from DB effectively, but this is a quick check matching actions.ts logic
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const videoId = formData.get('videoId') as string;

        if (!file || !videoId) {
            return NextResponse.json({ error: 'Missing file or videoId' }, { status: 400 });
        }

        // 1. Save file locally
        // Use a persistent location if possible, or project root for dev
        const uploadDir = join(process.cwd(), 'local_uploads');
        await ensureDir(uploadDir);

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${videoId}_${timestamp}_${safeName}`;
        const filePath = join(uploadDir, filename);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);

        // 2. Update DB status to processing
        await sql`
            UPDATE videos 
            SET processing_status = 'processing', processing_progress = 0 
            WHERE id = ${videoId}
        `;

        // 3. Spawn Demucs process via worker script
        // We use a separate Node.js script to handle the long-running process and DB updates.
        // This ensures the process continues even if the API route response finishes.

        // We can't easily capture progress from a detached process in this simple way without a watcher.
        // A better approach for "local" single-user is to NOT detach and just returning "Accepted", 
        // BUT Next.js might kill the lambda. 
        // Since it's "local environment", we can rely on Node.js process staying alive IF "npm run dev" stays alive?
        // Actually, Next.js API routes in waiting mode might timeout.
        // It is better to spawn a background script that does the heavy lifting and DB updating.

        // Let's create a dedicated runner script content dynamically or assume it exists.
        // For now, I'll spawn a simple node script that wraps the python call + DB update.
        const runnerScript = join(process.cwd(), 'scripts', 'process-audio.js');

        // Ensure stem output dir exists
        const outputDir = join(process.cwd(), 'public', 'stems');
        await ensureDir(outputDir);

        console.log(`[API] Spawning worker: ${process.execPath} ${runnerScript} ${videoId} ${filePath} ${outputDir}`);

        try {
            const child = spawn(process.execPath, [runnerScript, videoId, filePath, outputDir], {
                detached: true,
                stdio: 'ignore', // Keep ignore for detached, but rely on script's own file logging
                env: {
                    ...process.env,
                    PATH: `${join(process.cwd(), 'bin')}:${process.env.PATH}`
                } // Explicitly pass env with local bin
            });

            child.on('error', (err) => {
                console.error('[API] Failed to spawn worker:', err);
            });

            child.unref();
            console.log('[API] Worker spawned and detached.');
        } catch (spawnError) {
            console.error('[API] Spawn exception:', spawnError);
        }

        return NextResponse.json({ success: true, message: 'Processing started', filePath });
    } catch (e) {
        console.error('Upload error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

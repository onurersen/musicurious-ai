
import { sql } from '@vercel/postgres';
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Helper to check admin status (duplicated logic from actions to ensure API security)
async function checkAdmin() {
    // STRICTLY LOCAL ONLY
    if (process.env.NODE_ENV === 'production') {
        return false;
    }

    const user = await currentUser();
    if (!user) return false;

    const email = user.emailAddresses[0]?.emailAddress;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

    if (adminEmail && email === adminEmail) {
        return true;
    }

    const userRes = await sql`SELECT role FROM users WHERE id = ${user.id}`;
    return userRes.rows[0]?.role === 'admin';
}

export async function GET(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'This feature is disabled in production.' }, { status: 403 });
    }

    const isAdmin = await checkAdmin();
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const pitchStr = searchParams.get('pitch');
    const targetBpmStr = searchParams.get('targetBpm');
    const baseBpmStr = searchParams.get('baseBpm');
    const name = searchParams.get('name') || 'download.mp3';

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const pitch = parseFloat(pitchStr || '0');
    const targetBpm = parseFloat(targetBpmStr || '120');
    const baseBpm = parseFloat(baseBpmStr || '120');

    // Create temp paths
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);
    const outputPath = path.join(tmpDir, `output-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`);

    try {
        // 1. Download source file
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch source: ${response.statusText}`);
        if (!response.body) throw new Error("No response body");

        const fileStream = fs.createWriteStream(inputPath);
        // @ts-expect-error - pipeline types might be tricky with web streams
        await pipeline(Readable.fromWeb(response.body), fileStream);

        // 2. Construct FFmpeg args
        // Pitch shift: 2^(semitones/12)
        // Rate change affects both pitch and tempo.
        // To shift pitch by N semitones: Play at rate R = 2^(N/12). 
        // This makes it faster (higher pitch) or slower (lower pitch).
        // Then we need to correct the Tempo. 
        // Current Speed factor due to pitch shift = R.
        // We want Final Speed factor = (TargetBPM / BaseBPM).
        // So we need to apply atempo = (TargetBPM / BaseBPM) / R.

        const r = Math.pow(2, pitch / 12);
        const tempoRatio = targetBpm / baseBpm;
        const atempoVal = tempoRatio / r;

        // Note: atempo filter is limited to 0.5 to 2.0. If outside, we normally chain them.
        // For simplicity, we assume reasonable range or chain if needed.
        // Simple implementation: Just one atempo for now, or check range.

        let filterComplex = `asetrate=44100*${r}`;

        // Handle atempo range limits by chaining
        let remainingTempo = atempoVal;
        while (remainingTempo > 2.0) {
            filterComplex += `,atempo=2.0`;
            remainingTempo /= 2.0;
        }
        while (remainingTempo < 0.5) {
            filterComplex += `,atempo=0.5`;
            remainingTempo /= 0.5;
        }
        filterComplex += `,atempo=${remainingTempo}`;

        // 3. Run FFmpeg
        await new Promise<void>((resolve, reject) => {
            const ff = spawn('ffmpeg', [
                '-y',
                '-i', inputPath,
                '-filter:a', filterComplex,
                outputPath
            ]);

            ff.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`FFmpeg exited with code ${code}`));
            });

            ff.stderr.on('data', (d) => console.error(`FFmpeg: ${d}`));
        });

        // 4. Stream response
        const imageStream = fs.createReadStream(outputPath);

        // Cleanup after stream closes
        imageStream.on('close', () => {
            fs.unlink(inputPath, () => { });
            fs.unlink(outputPath, () => { });
        });

        // @ts-expect-error - Readable.toWeb types compatibility
        return new NextResponse(Readable.toWeb(imageStream), {
            headers: {
                'Content-Disposition': `attachment; filename="${name}"`,
                'Content-Type': 'audio/mpeg',
            }
        });

    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.error("Audio processing error:", e);
        // Clean up
        if (fs.existsSync(inputPath)) fs.unlink(inputPath, () => { });
        if (fs.existsSync(outputPath)) fs.unlink(outputPath, () => { });

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

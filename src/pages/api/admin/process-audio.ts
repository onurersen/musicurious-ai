import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { IncomingMessage } from 'http';

// Disable the default body parser to allow stream handling
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to ensure directory exists
async function ensureDir(dir: string) {
    try {
        await mkdir(dir, { recursive: true });
    } catch {
        // ignore if exists
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // STRICTLY LOCAL ONLY
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Audio processing is disabled in production.' });
        }

        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
        }

        // Setup upload dir
        const uploadDir = join(process.cwd(), 'local_uploads');
        await ensureDir(uploadDir);

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const busboy = require('busboy');
        const totalBytes = req.headers['content-length'];
        console.log(`[API-PAGES] Starting upload. Content-Length: ${totalBytes}`);
        const bb = busboy({ headers: req.headers });

        let videoId = '';
        let fileSavedPath = '';
        const fileWritePromises: Promise<void>[] = [];

        bb.on('file', (name: string, file: IncomingMessage, info: any) => {
            const { filename } = info;
            console.log(`[API-PAGES] Busboy receiving file: ${filename}`);

            const timestamp = Date.now();
            const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
            const tempFilename = `temp_${timestamp}_${safeName}`;
            const tempPath = join(uploadDir, tempFilename);
            fileSavedPath = tempPath;

            let bytesRead = 0;
            file.on('data', (data) => {
                bytesRead += data.length;
                if (bytesRead % (1024 * 1024 * 5) === 0 || bytesRead < 10000) { // Log every 5MB or start
                    console.log(`[API-PAGES] File ${filename} progress: ${bytesRead} bytes`);
                }
            });

            const writeStream = createWriteStream(tempPath);
            file.pipe(writeStream);

            const promo = new Promise<void>((resolve, reject) => {
                writeStream.on('close', () => {
                    console.log(`[API-PAGES] File ${filename} write stream closed. Total: ${bytesRead} bytes`);
                    resolve();
                });
                writeStream.on('error', (err) => {
                    console.error(`[API-PAGES] File ${filename} write stream error:`, err);
                    reject(err);
                });
            });
            fileWritePromises.push(promo);
        });

        bb.on('field', (name: string, val: string) => {
            if (name === 'videoId') {
                videoId = val;
            }
        });

        bb.on('close', async () => {
            try {
                await Promise.all(fileWritePromises);

                if (!videoId) {
                    if (fileSavedPath) try { await unlink(fileSavedPath); } catch { }
                    return res.status(400).json({ error: 'Missing videoId field' });
                }
                if (!fileSavedPath) {
                    return res.status(400).json({ error: 'No file uploaded' });
                }

                // Rename
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const { rename } = require('fs/promises');
                const timestamp = Date.now();
                const finalName = `${videoId}_${timestamp}_uploaded.wav`;
                const finalPath = join(uploadDir, finalName);

                await rename(fileSavedPath, finalPath);

                console.log(`[API-PAGES] File saved to: ${finalPath}`);

                // 2. Update DB status
                await sql`
                    UPDATE videos 
                    SET processing_status = 'processing', processing_progress = 0 
                    WHERE id = ${videoId}
                `;

                // 3. Spawn Worker
                const runnerScript = join(process.cwd(), 'scripts', 'process-audio.js');
                const outputDir = join(process.cwd(), 'public', 'stems');
                await ensureDir(outputDir);

                console.log(`[API-PAGES] Spawning worker: ${process.execPath} ${runnerScript} ${videoId} ${finalPath} ${outputDir}`);

                const child = spawn(process.execPath, [runnerScript, videoId, finalPath, outputDir], {
                    detached: true,
                    stdio: 'ignore',
                    env: {
                        ...process.env,
                        PATH: `${join(process.cwd(), 'bin')}:${process.env.PATH}`
                    }
                });

                child.on('error', (err) => {
                    // This only catches spawn errors (e.g. file not found), not runtime errors of the script
                    console.error('[API-PAGES] Failed to spawn worker:', err);
                });
                child.unref();

                return res.status(200).json({ success: true, message: 'Processing started', filePath: finalPath });

            } catch (err: any) {
                console.error("Processing logic error:", err);
                if (!res.headersSent) {
                    res.status(500).json({ error: `Processing failed: ${err.message}` });
                }
            }
        });

        bb.on('error', (err: any) => {
            console.error("Busboy stream error:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: `Upload stream failed: ${err.message}` });
            }
        });

        req.pipe(bb);

    } catch (e: any) {
        console.error('API Handler Critical Error:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: `Critical Server Error: ${e.message}`, stack: e.stack });
        }
    }
}

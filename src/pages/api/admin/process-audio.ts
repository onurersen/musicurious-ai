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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const busboy = require('busboy');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { appendFile, rename } = require('fs/promises');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extname } = require('path');

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

        // busboy already required
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _busboy = busboy;
        const totalBytes = req.headers['content-length'];
        console.log(`[API-PAGES] Starting upload. Content-Length: ${totalBytes}`);
        // Initialize file logger
        // appendFile already required
        // Define log file relative to project root since we might be in .next
        const logFile = join(process.cwd(), 'local_uploads', 'debug_log.txt');

        await ensureDir(join(process.cwd(), 'local_uploads'));

        const log = async (msg: string) => {
            const time = new Date().toISOString();
            await appendFile(logFile, `[${time}] ${msg}\n`).catch(() => { });
            console.log(msg);
        };

        log(`Starting upload handling. Headers: ${JSON.stringify(req.headers['content-type'] || 'none')}`);

        const bb = busboy({ headers: req.headers });

        let videoId = '';
        let fileSavedPath = '';
        let originalFilename = '';
        const fileWritePromises: Promise<void>[] = [];

        await new Promise<void>((resolve, reject) => {
            bb.on('file', (name: string, file: IncomingMessage, info: { filename: string, encoding: string, mimeType: string }) => {
                const { filename } = info;
                originalFilename = filename;
                log(`Busboy receiving file: ${filename}`);

                const timestamp = Date.now();
                const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
                const tempFilename = `temp_${timestamp}_${safeName}`;
                const tempPath = join(uploadDir, tempFilename);
                fileSavedPath = tempPath;

                let bytesRead = 0;
                file.on('data', (data) => {
                    bytesRead += data.length;
                });

                const writeStream = createWriteStream(tempPath);
                file.pipe(writeStream);

                const promo = new Promise<void>((resolveFile, rejectFile) => {
                    writeStream.on('close', () => {
                        log(`File ${filename} closed. Bytes: ${bytesRead}`);
                        resolveFile();
                    });
                    writeStream.on('error', (err) => {
                        log(`File ${filename} stream error: ${err}`);
                        rejectFile(err);
                    });
                });
                fileWritePromises.push(promo);
            });

            bb.on('field', (name: string, val: string) => {
                if (name === 'videoId') videoId = val;
            });

            bb.on('close', async () => {
                try {
                    log('Busboy stream closed. Waiting for writes...');
                    await Promise.all(fileWritePromises);

                    if (!videoId) {
                        log('Error: Missing videoId');
                        if (fileSavedPath) try { await unlink(fileSavedPath); } catch { }
                        throw new Error('Missing videoId field');
                    }
                    if (!fileSavedPath) {
                        log('Error: No file path recorded');
                        throw new Error('No file uploaded');
                    }

                    // Rename
                    // Rename already required
                    const timestamp = Date.now();
                    const ext = extname(originalFilename) || '.wav'; // Fallback to .wav
                    const finalName = `${videoId}_${timestamp}_uploaded${ext}`;
                    const finalPath = join(uploadDir, finalName);

                    await rename(fileSavedPath, finalPath);
                    log(`File renamed to: ${finalPath}`);

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

                    log(`Spawning worker: ${runnerScript}`);

                    const child = spawn(process.execPath, [runnerScript, videoId, finalPath, outputDir], {
                        detached: true,
                        stdio: 'ignore',
                        env: {
                            ...process.env,
                            PATH: `${join(process.cwd(), 'bin')}:${process.env.PATH}`
                        }
                    });

                    child.on('error', (err) => {
                        log(`Spawn error: ${err}`);
                    });
                    child.unref();

                    res.status(200).json({ success: true, message: 'Processing started', filePath: finalPath });
                    resolve();

                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    log(`Processing logic error: ${msg}`);
                    if (!res.headersSent) {
                        res.status(500).json({ error: `Processing failed: ${msg}` });
                    }
                    resolve();
                }
            });

            bb.on('error', (err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err);
                log(`Busboy stream level error: ${msg}`);
                if (!res.headersSent) {
                    res.status(500).json({ error: `Upload stream failed: ${msg}` });
                }
                resolve();
            });

            req.pipe(bb);
        });

    } catch (e: unknown) {
        console.error('API Handler Critical Error:', e);
        if (!res.headersSent) {
            const msg = e instanceof Error ? e.message : String(e);
            res.status(500).json({ error: `Critical Server Error: ${msg}`, stack: e instanceof Error ? e.stack : undefined });
        }
    }
}

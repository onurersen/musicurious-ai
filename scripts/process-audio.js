const { spawn } = require('child_process');
const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

// Logging helper to debug
const logFile = path.join(process.cwd(), 'demucs-debug.log');
function log(message) {
    try {
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
    } catch (e) {
        console.error("Logging failed:", e);
    }
}

log(`Worker started. PID: ${process.pid}`);

// Try loading .env.local first, then .env
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    log(`Loading env from ${envLocalPath}`);
    require('dotenv').config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
    log(`Loading env from ${envPath}`);
    require('dotenv').config({ path: envPath });
} else {
    log('No .env file found!');
}

const videoId = process.argv[2];
const filePath = process.argv[3];
const outputDir = process.argv[4];

log(`Args: videoId=${videoId}, filePath=${filePath}, outputDir=${outputDir}`);

if (!videoId || !filePath || !outputDir) {
    log('Missing arguments. Exiting.');
    process.exit(1);
}

async function run() {
    try {
        log('Updating status to processing...');
        await sql`UPDATE videos SET processing_status = 'processing', processing_progress = 0 WHERE id = ${videoId}`;

        // --- NEW: Audio Analysis Step ---
        log('Starting audio analysis (BPM/Key)...');
        const analysisScript = path.join(process.cwd(), 'scripts', 'analyze_audio.py');
        try {
            // execSync is fine here as analysis is relatively fast and we want it before stems
            // or use spawnPromise if we want non-blocking, but blocking is simpler for sequential flow
            const { execSync } = require('child_process');

            // Need to set PYTHONHTTPSVERIFY for librosa/numba potential network fetches? likely not needed for local files but safe to keep env
            const analysisOutput = execSync(`python3 "${analysisScript}" "${filePath}"`, {
                env: { ...process.env, PATH: `${path.join(process.cwd(), 'bin')}:${process.env.PATH}` }
            }).toString();

            const analysisResult = JSON.parse(analysisOutput);
            if (analysisResult.error) {
                log(`Analysis warning: ${analysisResult.error}`);
            } else {
                log(`Analysis success: BPM=${analysisResult.bpm}, Key=${analysisResult.key} ${analysisResult.scale}`);
                await sql`
                    UPDATE videos 
                    SET bpm = ${analysisResult.bpm},
                        key_tonic = ${analysisResult.key},
                        key_scale = ${analysisResult.scale}
                    WHERE id = ${videoId}
                `;
            }
        } catch (err) {
            log(`Analysis failed: ${err.message}`);
            // Continue processing anyway
        }
        // --------------------------------

        // Use the custom wrapper script that monkeypatches torchaudio.save
        const runnerScript = path.join(process.cwd(), 'scripts', 'run_demucs.py');
        log(`Spawning Demucs Wrapper: python3 ${runnerScript} -m demucs.separate ...`);

        const demucs = spawn('python3', [
            runnerScript,
            '-o', outputDir,
            '-n', 'htdemucs_6s', // Use 6-stem model
            '--mp3',
            '--mp3-bitrate', '320',
            '--segment', '7',
            '--overlap', '0.5',
            filePath
        ], {
            env: {
                ...process.env,
                PATH: `${path.join(process.cwd(), 'bin')}:${process.env.PATH}`,
                PYTHONHTTPSVERIFY: '0' // Bypass SSL for model download
            }
        });

        let currentProgress = 0;

        demucs.stdout.on('data', (data) => {
            log(`STDOUT: ${data}`);
        });



        demucs.stderr.on('data', (data) => {
            const output = data.toString();
            log(`STDERR: ${output}`);

            const match = output.match(/(\d+)%/);
            if (match) {
                const percent = parseInt(match[1]);
                if (!isNaN(percent)) {
                    // Start at 0, max out at 80% for Demucs phase
                    const scaledProgress = Math.round(percent * 0.8);

                    // Only update if we moved forward to avoid database spam
                    if (scaledProgress > currentProgress) {
                        currentProgress = scaledProgress;
                        sql`UPDATE videos SET processing_progress = ${currentProgress} WHERE id = ${videoId}`
                            .catch(err => log(`DB Update Error: ${err.message}`));
                    }
                }
            }
        });

        demucs.on('close', (code) => {
            if (code !== 0) {
                const failureMsg = `Demucs process exited with code ${code}`;
                log(failureMsg);
                // Mark DB as failed
                sql`UPDATE videos SET processing_status = 'failed' WHERE id = ${videoId}`.catch(console.error);
                process.exit(code);
                return;
            }

            log('Demucs processing successfully completed. Starting mix generation...');

            // Ensure we are at least at 80% before starting mixes
            if (currentProgress < 80) {
                currentProgress = 80;
                sql`UPDATE videos SET processing_progress = 80 WHERE id = ${videoId}`.catch(() => { });
            }

            // Expected output path for htdemucs_6s model
            const modelName = 'htdemucs_6s';
            const trackName = path.parse(filePath).name;
            const stemsPath = path.join(outputDir, modelName, trackName);

            log(`Running mix generation on: ${stemsPath}`);
            const mixer = spawn('python3', [
                path.join(process.cwd(), 'scripts', 'create_mixes.py'),
                stemsPath
            ], {
                env: { ...process.env, PATH: `${path.join(process.cwd(), 'bin')}:${process.env.PATH}` }
            });

            // We expect 5 mixes. We have 20% progress left (80 -> 100).
            // So each mix is worth ~4%.
            let mixCount = 0;

            mixer.stdout.on('data', (data) => {
                const msg = data.toString();
                log(`Mixer STDOUT: ${msg}`);

                // Check for "Creating {mix_name}..."
                // Data chunk might contain multiple lines, so we count all occurrences
                const matches = msg.match(/Creating /g);
                if (matches && matches.length > 0) {
                    mixCount += matches.length;

                    // Base 80% + 4% per mix
                    const nextProgress = Math.min(99, 80 + (mixCount * 4));

                    if (nextProgress > currentProgress) {
                        currentProgress = nextProgress;
                        log(`Mixer progress: ${currentProgress}%`);
                        sql`UPDATE videos SET processing_progress = ${currentProgress} WHERE id = ${videoId}`
                            .catch(err => log(`DB Update Error (Mixer): ${err.message}`));
                    }
                }
            });

            mixer.stderr.on('data', (data) => log(`Mixer STDERR: ${data}`));

            mixer.on('close', async (mixerCode) => {
                if (mixerCode !== 0) {
                    log(`Mixer process exited with code ${mixerCode}. Continuing anyway as stems might be fine.`);
                } else {
                    log("Mix generation completed successfully.");
                }

                log("Processing flow finished.");

                // Force update progress to 100 when fully done
                try {
                    await sql`UPDATE videos SET processing_progress = 100 WHERE id = ${videoId}`;
                    log("Updated progress to 100.");
                } catch (e) {
                    log(`Error updating progress: ${e}`);
                }

                // Exit the process after mix generation and progress update
                process.exit(0);
            });
        });

        demucs.on('error', (err) => {
            log(`Failed to start Demucs process: ${err.message}`);
            sql`UPDATE videos SET processing_status = 'failed' WHERE id = ${videoId}`.catch(() => { });
        });

    } catch (err) {
        log(`Fatal Error: ${err.message}`);
        await sql`UPDATE videos SET processing_status = 'failed' WHERE id = ${videoId}`;
        process.exit(1);
    }
}

run();

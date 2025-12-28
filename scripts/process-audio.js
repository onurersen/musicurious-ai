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
                    // Update DB 
                    // log(`Progress detected: ${percent}%`);
                    sql`UPDATE videos SET processing_progress = ${percent} WHERE id = ${videoId}`
                        .catch(err => log(`DB Update Error: ${err.message}`));
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

            // Expected output path for htdemucs_6s model
            // Demucs output structure: outputDir/modelName/trackName
            // trackName is currently just filename without extension?
            // "htdemucs_6s/8_1766952784376_Sevda_C_ic_eg_i_-_Mor_ve_O_tesi"

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

            mixer.stdout.on('data', (data) => log(`Mixer STDOUT: ${data}`));
            mixer.stderr.on('data', (data) => log(`Mixer STDERR: ${data}`));

            mixer.on('close', (mixerCode) => {
                if (mixerCode !== 0) {
                    log(`Mixer process exited with code ${mixerCode}. Continuing anyway as stems might be fine.`);
                } else {
                    log("Mix generation completed successfully.");
                }

                log("Processing flow finished.");

                // Assuming route handles DB update via progress polling? 
                // No, the original implementation relied on `transfer-stems` to mark "completed"?
                // Wait, process-audio doesn't mark "completed".
                // Actually `transfer-stems` marks completion.
                // But the UI needs to know when it *can* transfer.
                // The `process-audio` worker updates progress.
                // It should probably set it to 100% or "ready_to_transfer"?
                // Currently it stops at progress updates.
                // The `transfer-stems` button appears when status is 'completed' ?? 
                // No, previously the user had to click Transfer.
                // The worker should update status to 'completed' or 'ready'?
                // VideoRow checks `procStatus === 'completed'` for Transfer button?
                // Actually, let's check video-row.tsx again.
                // Line 118: `procStatus === 'completed' && ...`
                // But `process-audio.js` only updates progress.
                // The `transfer-stems` API (called by button) sets status to 'completed'.
                // So the status *before* transfer must be something else?
                // Ah, the worker sets it to 'processing'.
                // If it stays 'processing' (even at 100%), does the button appear?
                // VideoRow: `progress === 100 && procStatus === 'processing'`.

                // So we need to ensure progress reaches 100.
                // Let's force update progress to 100 here.
                sql`UPDATE videos SET processing_progress = 100 WHERE id = ${videoId}`
                    .then(() => log("Updated progress to 100."))
                    .catch(e => log(`Error updating progress: ${e}`));

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

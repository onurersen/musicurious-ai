# implementation Plan: Stem Download with Pitch/Tempo Shift

## Overview
This feature allows Admin users in the Local Environment to download audio stems (or filtered tracks) with applied pitch and tempo modifications.

## Requirements
- **Role**: Admin only.
- **Environment**: Local Development only (`process.env.NODE_ENV === 'development'`).
- **Functionality**:
  - Filter by stem/track.
  - Apply selected Pitch (semitones) and Tempo (BPM) from the UI.
  - Generate and download the processed audio file.

## Architecture

### 1. Frontend (`SessionPlayer`)
- **Location**: `src/components/session-player.tsx`
- **Changes**:
  - Receive `isAdmin` and `isLocal` props (passed from server page).
  - Add a "Download" button to each stem card (instrument and filter).
  - Button Visibility: Only if `isAdmin && isLocal` is true.
  - **Action**: On click, trigger a window download by navigating to the API endpoint with query parameters:
    - `url`: The blob URL of the stem.
    - `pitch`: Current pitch shift key (semitones).
    - `targetBpm`: Current target BPM.
    - `baseBpm`: Original BPM of the track.
    - `name`: Filename for the download.

### 2. Server Page (`SessionPage`)
- **Location**: `src/app/session/[id]/page.tsx`
- **Changes**:
  - Check Admin status using `isAdmin()`.
  - Check Environment status (`process.env.NODE_ENV`).
  - Pass these flags to `SessionPlayer`.

### 3. Backend API
- **New Endpoint**: `src/app/api/admin/download-stem/route.ts`
- **Method**: `GET`
- **Responsibility**:
  1.  **Validation**: Verify `isAdmin` and `isLocal`. Return 403 if invalid.
  2.  **Input Parsing**: Parse query params (`url`, `pitch`, `targetBpm`, `baseBpm`).
  3.  **File Fetching**: Download the source audio file from the provided `url` (Vercel Blob) to a temporary local file.
  4.  **Processing**:
      - Use `ffmpeg` to apply pitch and tempo changes.
      - **Pitch/Tempo Logic**:
        - Calculate `rate = targetBpm / baseBpm`.
        - Calculate `pitch_correction = -12 * log2(rate)`.
        - `final_pitch = user_pitch + pitch_correction`.
        - Use `asetrate` filter for resampling (affects pitch & speed).
        - Use `atempo` filter to correct speed to target tempo.
  5.  **Response**: Stream the processed file back to the client with `Content-Disposition: attachment`.
  6.  **Cleanup**: Delete temporary input/output files.

## Technical Details

### FFmpeg Command Construction
```bash
ffmpeg -i input.mp3 -filter:a "asetrate=44100*R,atempo=1/R,atempo=TEMPO_RATIO" output.mp3
```
*Note: `asetrate` changes both. We might need a simpler chain depending on the exact acoustic requirements, but the standard approach for independent pitch/tempo control in FFmpeg is using `atempo` (for time-stretch) or `rubberband` if available. Since we want to support standard FFmpeg builds:*
- **Algorithm**:
  - To shift Pitch by `n` semitones: `asetrate=r_sample_rate`, `atempo=1/r`.
  - To shift Tempo by `ratio`: `atempo=ratio`.
  - Combined: `asetrate=44100*2^(n/12), atempo=1/2^(n/12), atempo=target/base`.

### File Handling
- Use `os.tmpdir()` to store temporary downloads and processed files.
- Ensure unique filenames using `crypto.randomUUID()`.

## Security
- **Strict Admin Check**: Re-verify admin status in the API Route.
- **Local Env Check**: Ensure the API route explicitly rejects requests in Production.

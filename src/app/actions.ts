"use server";

import { sql } from '@vercel/postgres';
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// ... existing interfaces ...

// ... (skip down to deleteUser and banUser) ...

export async function deleteUser(userId: string) {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        // 1. Delete from Clerk (if possible)
        try {
            const client = await clerkClient();
            await client.users.deleteUser(userId);
            console.log(`[deleteUser] Deleted user ${userId} from Clerk`);
        } catch {
            console.error(`[deleteUser] Failed to delete user ${userId} from Clerk (proceeding with DB delete)`);
        }

        // 2. Delete from App DB
        await sql`DELETE FROM videos WHERE user_id = ${userId}`;
        await sql`DELETE FROM users WHERE id = ${userId}`;
        revalidatePath('/admin/users');
        return { success: true };
    } catch (err) {
        console.error("Error deleting user:", err);
        return { success: false, error: "Database error" };
    }
}

export async function banUser(userId: string, email: string) {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        // 1. Add to banned list
        await sql`INSERT INTO banned_emails (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;

        // 2. Delete from Clerk
        try {
            const client = await clerkClient();
            await client.users.deleteUser(userId);
            console.log(`[banUser] Deleted user ${userId} from Clerk`);
        } catch {
            console.error(`[banUser] Failed to delete user ${userId} from Clerk`);
        }

        // 3. Delete from App DB
        await sql`DELETE FROM videos WHERE user_id = ${userId}`;
        await sql`DELETE FROM users WHERE id = ${userId}`;

        revalidatePath('/admin/users');
        return { success: true };
    } catch (err) {
        console.error("Error banning user:", err);
        return { success: false, error: "Database error" };
    }
}

export async function forceLogoutUser(userId: string) {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        const client = await clerkClient();
        const sessions = await client.sessions.getSessionList({ userId, status: 'active' });

        for (const session of sessions.data) {
            await client.sessions.revokeSession(session.id);
        }

        console.log(`[forceLogoutUser] Revoked ${sessions.data.length} sessions for user ${userId}`);
        return { success: true, count: sessions.data.length };
    } catch (err) {
        console.error("Error forcing logout:", err);
        return { success: false, error: "Failed to revoke sessions" };
    }
}

export interface Video {
    id: number;
    youtube_url: string;
    title?: string;
    status: string; // e.g. 'pending', 'completed'
    created_at: string;
    updated_at: string | null;
    user_id: string;
    approval_status: string;
    user_email?: string;
    first_name?: string;
    last_name?: string;
    processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
    processing_progress?: number;
    bpm?: number;
    key_tonic?: string;
    key_scale?: string;
    time_signature?: string;
    chords?: { chord: string; start: number; end: number }[];
}

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    status: 'pending' | 'approved' | 'blocked';
    created_at: string;
    last_login?: string | null;
}

export async function checkVideoCategory(url: string) {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
            next: { revalidate: 0 } // No cache for fresh results
        });

        const html = await response.text();

        // Check for <meta itemprop="genre" content="Music">
        const isMusicGenre = /<meta\s+itemprop="genre"\s+content="Music"/i.test(html);

        // Check for "category":"Music" in JSON (strict)
        const isMusicCategory = /"category"\s*:\s*"Music"/i.test(html);

        // Check title using regex for proper extraction
        const titleMatch = html.match(/<title>(.*?)<\/title>/) || html.match(/<meta property="og:title" content="(.*?)">/);
        const rawTitle = titleMatch ? titleMatch[1].replace(" - YouTube", "") : "";
        const title = rawTitle || "Unknown Title";

        console.log(`Checking URL: ${url}`);
        console.log(`isMusicGenre: ${isMusicGenre}, isMusicCategory: ${isMusicCategory}, title: ${title}`);

        return {
            isMusic: isMusicGenre || isMusicCategory,
            category: isMusicGenre || isMusicCategory ? "Music" : "Unknown",
            title
        };
    } catch (error) {
        console.error("Failed to fetch video page:", error);
        // If we can't check, we assume it's okay but maybe warn we couldn't verify
        return { isMusic: true, category: "Error" };
    }
}

export async function getSessionFiles(videoId: number) {
    try {
        const { join } = await import('path');
        const { readdir } = await import('fs/promises');
        const fs = await import('fs');

        const stemRoots = [
            join(process.cwd(), 'public', 'stems', 'htdemucs'),
            join(process.cwd(), 'public', 'stems', 'htdemucs_6s')
        ];

        let foundFolder = null;
        let rootUsed = "";

        // Find the folder
        for (const root of stemRoots) {
            if (fs.existsSync(root)) {
                const entries = await readdir(root, { withFileTypes: true });
                const folder = entries.find(e => e.isDirectory() && e.name.startsWith(`${videoId}_`));
                if (folder) {
                    foundFolder = folder.name;
                    rootUsed = root;
                    break;
                }
            }
        }

        if (!foundFolder) {
            return [];
        }

        const folderPath = join(rootUsed, foundFolder);
        const files = await readdir(folderPath);

        // Filter for audio files (mp3/wav)
        const sessionFiles = files
            .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
            .map(f => {
                // Construct public URL
                // Assuming public/stems maps to /stems
                const relativeRoot = rootUsed.split('public')[1];
                return {
                    name: f,
                    url: join(relativeRoot, foundFolder as string, f)
                };
            });

        return sessionFiles;

    } catch (err) {
        console.error("Error getting session files:", err);
        return [];
    }
}

export async function createVideoRecord(url: string, title?: string) {
    try {
        const user = await currentUser();
        if (!user) {
            return { success: false, error: 'Unauthorized' };
        }

        const email = user.emailAddresses[0]?.emailAddress || "unknown";
        const role = email === 'onurersen@gmail.com' ? 'admin' : 'user';

        // Check if user is banned
        const bannedCheck = await sql`SELECT * FROM banned_emails WHERE email = ${email}`;
        if (bannedCheck.rows.length > 0) {
            return { success: false, error: 'User is banned' };
        }

        // Upsert user
        // We set status to 'approved' for admin explicitly
        const initialStatus = role === 'admin' ? 'approved' : 'pending';

        await sql`
            INSERT INTO users (id, email, first_name, last_name, role, status)
            VALUES (${user.id}, ${email}, ${user.firstName}, ${user.lastName}, ${role}, ${initialStatus})
            ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = ${role},
            last_login = NOW();
        `;

        // Check Permissions (must be approved)
        const userRow = await sql`SELECT status FROM users WHERE id = ${user.id}`;
        const userStatus = userRow.rows[0]?.status;

        if (userStatus === 'pending') {
            return { success: false, error: 'Account pending approval' };
        }
        if (userStatus === 'blocked') {
            return { success: false, error: 'Account blocked' };
        }

        // Check for duplicate submission
        const duplicateCheck = await sql`
            SELECT id FROM videos 
            WHERE user_id = ${user.id} AND youtube_url = ${url}
        `;
        if (duplicateCheck.rows.length > 0) {
            return { success: false, error: 'Duplicate submission' };
        }

        // Insert and return the new row
        const result = await sql`
          INSERT INTO videos (youtube_url, title, status, user_id, approval_status, processing_status, processing_progress)
          VALUES (${url}, ${title || 'Untitled Jam'}, 'pending', ${user.id}, 'pending', 'pending', 0)
          RETURNING id, youtube_url, title, status, created_at, approval_status, processing_status, processing_progress;
        `;
        return { success: true, video: result.rows[0] };
    } catch (error) {
        console.error('Failed to create video record:', error);
        return { success: false, error: 'Database error' };
    }
}

export async function getVideos(): Promise<Video[]> {
    const user = await currentUser();
    if (!user) return [];

    try {
        // Get user role
        const email = user.emailAddresses[0]?.emailAddress;
        let role = 'user';

        if (email === 'onurersen@gmail.com') {
            role = 'admin';
        } else {
            const userRes = await sql`SELECT role FROM users WHERE id = ${user.id}`;
            role = userRes.rows[0]?.role || 'user';
        }

        let rows;
        if (role === 'admin') {
            const result = await sql`
                SELECT v.*, u.email as user_email, u.first_name, u.last_name 
                FROM videos v 
                LEFT JOIN users u ON v.user_id = u.id 
                ORDER BY v.created_at DESC
            `;
            rows = result.rows;
        } else {
            const result = await sql`
                SELECT * FROM videos 
                WHERE user_id = ${user.id} 
                ORDER BY created_at DESC
            `;
            rows = result.rows;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return rows.map((row: any) => ({
            ...row,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
        })) as Video[];

    } catch (err) {
        console.error("Error fetching videos:", err);
        return [];
    }
}

export async function updateVideoApproval(videoId: number, status: 'approved' | 'rejected') {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const email = user.emailAddresses[0]?.emailAddress;
    let isAdmin = false;

    if (email === 'onurersen@gmail.com') {
        isAdmin = true;
    } else {
        const userRes = await sql`SELECT role FROM users WHERE id = ${user.id}`;
        isAdmin = userRes.rows[0]?.role === 'admin';
    }

    if (!isAdmin) {
        return { success: false, error: "Forbidden" };
    }

    try {
        if (status === 'rejected') {
            await sql`DELETE FROM videos WHERE id = ${videoId}`;
        } else {
            await sql`
                UPDATE videos 
                SET approval_status = ${status} 
                WHERE id = ${videoId}
            `;
        }
        revalidatePath('/videos');
        revalidatePath('/admin/videos');
        return { success: true };
    } catch (err) {
        console.error("Error updating video:", err);
        return { success: false, error: "Update failed" };
    }
}

export async function isAdmin() {
    const user = await currentUser();
    if (!user) return false;

    const email = user.emailAddresses[0]?.emailAddress;
    if (email === 'onurersen@gmail.com') return true;

    const res = await sql`SELECT role FROM users WHERE id = ${user.id}`;
    return res.rows[0]?.role === 'admin';
}

export async function trackUserActivity(userId: string) {
    try {
        await sql`UPDATE users SET last_login = NOW() WHERE id = ${userId}`;
    } catch (e) {
        console.error("Failed to track user activity:", e);
    }
}

export async function getUserStatus() {
    const user = await currentUser();
    if (!user) return null;

    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();

    console.log(`[getUserStatus] Checking status for ${email} (${user.id})`);

    try {
        // Check if banned - this handles cases where user was 'banned' (deleted + added to ban list)
        const bannedCheck = await sql`SELECT 1 FROM banned_emails WHERE email = ${email}`;
        if (bannedCheck.rows.length > 0) {
            console.log(`[getUserStatus] User ${email} is banned`);
            return 'blocked';
        }

        const res = await sql`SELECT status, role FROM users WHERE id = ${user.id}`;

        // If user record doesn't exist, create it as pending
        if (res.rows.length === 0) {
            console.log(`[getUserStatus] User ${user.emailAddresses[0]?.emailAddress} not found in DB, creating pending record.`);
            const email = user.emailAddresses[0]?.emailAddress;
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const role = 'user';

            await sql`
                INSERT INTO users (id, email, first_name, last_name, role, status, last_login)
                VALUES (${user.id}, ${email}, ${firstName}, ${lastName}, ${role}, 'pending', NOW())
                ON CONFLICT (id) DO NOTHING
            `;

            // Re-fetch to be sure or just return pending
            return 'pending';
        }

        if (res.rows.length > 0) {
            // Update last_login silently for existing users
            await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`;
        }

        const status = res.rows[0]?.status;
        const role = res.rows[0]?.role;

        console.log(`[getUserStatus] DB result for ${user.id}: status=${status}, role=${role}`);

        if (role === 'admin' || email === 'onurersen@gmail.com') return 'approved';
        return status || 'pending';
    } catch (e) {
        console.error("Error getting user status:", e);
        return 'pending';
    }
}

// User Management Actions

export async function getUsers(): Promise<User[]> {
    const user = await currentUser();
    if (!user) return [];

    const admin = await isAdmin();
    if (!admin) return [];

    try {
        const result = await sql`
            SELECT * FROM users 
            ORDER BY created_at DESC
        `;
        return result.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at).toISOString(),
            last_login: row.last_login ? new Date(row.last_login).toISOString() : null
        })) as User[];
    } catch (err) {
        console.error("Error fetching users:", err);
        return [];
    }
}

export async function updateUserStatus(userId: string, status: 'approved' | 'blocked' | 'pending') {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        await sql`UPDATE users SET status = ${status} WHERE id = ${userId}`;
        revalidatePath('/admin/users');
        return { success: true };
    } catch (err) {
        console.error("Error updating user status:", err);
        return { success: false, error: "Database error" };
    }
}

export interface Stem {
    id: number;
    video_id: number;
    type: string;
    blob_url: string;
    created_at: string;
}

export async function getJam(id: number) {
    try {
        const currentUserObj = await currentUser();
        const currentEmail = currentUserObj?.emailAddresses[0]?.emailAddress;
        let isUserAdmin = false;

        if (currentEmail === 'onurersen@gmail.com') {
            isUserAdmin = true;
        } else if (currentUserObj) {
            // Ideally check DB role, but this is a lightweight server action
            const userRes = await sql`SELECT role FROM users WHERE id = ${currentUserObj.id}`;
            isUserAdmin = userRes.rows[0]?.role === 'admin';
        }

        // Fetch Video
        const videoRes = await sql`
            SELECT v.*, u.email as user_email, u.first_name, u.last_name 
            FROM videos v 
            LEFT JOIN users u ON v.user_id = u.id 
            WHERE v.id = ${id}
        `;

        if (videoRes.rows.length === 0) {
            return null;
        }

        const rawVideo = videoRes.rows[0];

        // PII Protection
        const isOwner = currentUserObj && rawVideo.user_id === currentUserObj.id;

        if (!isUserAdmin && !isOwner) {
            // Redact email
            delete rawVideo.user_email;
        }

        const video = {
            ...rawVideo,
            created_at: new Date(rawVideo.created_at).toISOString(),
            updated_at: rawVideo.updated_at ? new Date(rawVideo.updated_at).toISOString() : null
        } as Video;

        // Fetch Stems
        const stemsRes = await sql`
            SELECT * FROM stems 
            WHERE video_id = ${id}
        `;

        const stems = stemsRes.rows.map(row => ({
            ...row,
            created_at: new Date(row.created_at).toISOString()
        })) as Stem[];

        // Fetch User Settings if logged in
        let userSettings = null;
        if (currentUserObj) {
            const settingsRes = await sql`
                SELECT pitch, tempo, active_track 
                FROM user_jam_settings 
                WHERE user_id = ${currentUserObj.id} AND video_id = ${id}
            `;
            if (settingsRes.rows.length > 0) {
                userSettings = settingsRes.rows[0] as UserJamSettings;
            }
        }

        return { video, stems, userSettings };

    } catch (err) {
        console.error("Error fetching jam:", err);
        return null;
    }
}

export async function getVideoStatus(videoId: number) {
    // Basic auth check not strictly needed for just status reading but safer
    const user = await currentUser();
    if (!user) return null;

    try {
        const result = await sql`
            SELECT processing_status, processing_progress 
            FROM videos WHERE id = ${videoId}
        `;
        return result.rows[0] as { processing_status: 'pending' | 'processing' | 'completed' | 'failed', processing_progress: number };
    } catch {
        return null;
    }
}

export async function removeStems(videoId: number) {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        const { join } = await import('path');
        const { rm, readdir } = await import('fs/promises');
        const { del } = await import('@vercel/blob');

        // 0. Cleanup Vercel Blobs
        try {
            const stemsRes = await sql`SELECT blob_url FROM stems WHERE video_id = ${videoId}`;
            const blobUrls = stemsRes.rows.map(r => r.blob_url).filter(url => url);

            if (blobUrls.length > 0) {
                console.log(`[removeStems] Deleting ${blobUrls.length} blobs for video ${videoId}`);
                await del(blobUrls); // del accepts string or string[]
            }
        } catch (e) {
            console.error("[removeStems] Error cleaning up blobs (continuing..):", e);
        }

        // Check both potential locations (legacy 4-stem and new 6-stem)
        const stemRoots = [
            join(process.cwd(), 'public', 'stems', 'htdemucs'),
            join(process.cwd(), 'public', 'stems', 'htdemucs_6s')
        ];

        // Find folders starting with videoId_
        for (const stemsRoot of stemRoots) {
            try {
                const entries = await readdir(stemsRoot, { withFileTypes: true });
                const folders = entries
                    .filter(e => e.isDirectory() && e.name.startsWith(`${videoId}_`))
                    .map(e => join(stemsRoot, e.name));

                for (const folder of folders) {
                    console.log(`Removing stem folder: ${folder}`);
                    await rm(folder, { recursive: true, force: true });
                }
            } catch {
                // Ignore missing dirs
            }
        }

        // Database Cleanup
        await sql`BEGIN`;
        await sql`DELETE FROM stems WHERE video_id = ${videoId}`;
        await sql`
            UPDATE videos 
            SET processing_status = 'pending', processing_progress = 0 
            WHERE id = ${videoId}
        `;
        await sql`COMMIT`;

        // 3. Delete Original Audio from local_uploads
        try {
            const uploadsRoot = join(process.cwd(), 'local_uploads');
            const uploadEntries = await readdir(uploadsRoot, { withFileTypes: true });
            const uploadFiles = uploadEntries
                .filter(e => e.isFile() && e.name.startsWith(`${videoId}_`))
                .map(e => join(uploadsRoot, e.name));

            for (const file of uploadFiles) {
                console.log(`Removing local upload: ${file}`);
                await rm(file, { force: true });
            }
        } catch (e) {
            console.warn("Error cleaning up local_uploads (might not exist):", e);
        }

        revalidatePath('/admin/videos');
        return { success: true };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error("Error removing stems:", err);
        return { success: false, error: err.message };
    }
}

export async function cancelProcessing(videoId: number) {
    const admin = await isAdmin();
    if (!admin) return { success: false, error: "Forbidden" };

    try {
        const { join } = await import('path');
        const { readdir, rm } = await import('fs/promises');

        // 1. Delete Original Audio from local_uploads
        try {
            const uploadsRoot = join(process.cwd(), 'local_uploads');
            const uploadEntries = await readdir(uploadsRoot, { withFileTypes: true });
            const uploadFiles = uploadEntries
                .filter(e => e.isFile() && e.name.startsWith(`${videoId}_`))
                .map(e => join(uploadsRoot, e.name));

            for (const file of uploadFiles) {
                console.log(`[cancelProcessing] Removing local upload: ${file}`);
                await rm(file, { force: true });
            }
        } catch (e) {
            console.warn("Error cleaning up local_uploads (might not exist):", e);
        }

        // 2. Update DB
        await sql`
            UPDATE videos 
            SET processing_status = 'failed', processing_progress = 0 
            WHERE id = ${videoId}
        `;
        revalidatePath('/admin/videos');
        return { success: true };
    } catch (err) {
        console.error("Error canceling processing:", err);
        return { success: false, error: "Database error" };
    }
}

export interface UserJamSettings {
    pitch: number;
    tempo: number;
    active_track: string | null;
}

export async function saveJamSettings(videoId: number, settings: UserJamSettings) {
    const user = await currentUser();
    if (!user) {
        console.log("[saveJamSettings] No user logged in.");
        return { success: false, error: "Unauthorized" };
    }
    console.log(`[saveJamSettings] Saving for user ${user.id}, video ${videoId}:`, settings);

    try {
        await sql`
            INSERT INTO user_jam_settings (user_id, video_id, pitch, tempo, active_track, updated_at)
            VALUES (${user.id}, ${videoId}, ${Math.round(settings.pitch)}, ${Math.round(settings.tempo)}, ${settings.active_track}, NOW())
            ON CONFLICT (user_id, video_id) 
            DO UPDATE SET 
                pitch = EXCLUDED.pitch,
                tempo = EXCLUDED.tempo,
                active_track = EXCLUDED.active_track,
                updated_at = NOW();
        `;
        console.log("[saveJamSettings] Success.");
        return { success: true };
    } catch (err) {
        console.error("Error saving jam settings:", err);
        return { success: false, error: "Database error" };
    }
}

// Extracted Sections Actions

export interface ExtractedSection {
    id: number;
    user_id: string;
    video_id: number;
    title: string;
    start_time: number;
    end_time: number;
    created_at: string;
}

export async function saveExtractedSection(videoId: number, start: number, end: number, title: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const result = await sql`
            INSERT INTO extracted_sections (user_id, video_id, title, start_time, end_time)
            VALUES (${user.id}, ${videoId}, ${title}, ${start}, ${end})
            RETURNING *;
        `;
        revalidatePath(`/jam/${videoId}`); // Assuming this is the path
        return { success: true, section: result.rows[0] };
    } catch (err) {
        console.error("Error saving extracted section:", err);
        return { success: false, error: "Database error" };
    }
}

export async function getExtractedSections(videoId: number) {
    const user = await currentUser();
    if (!user) return [];

    try {
        const result = await sql`
            SELECT * FROM extracted_sections 
            WHERE user_id = ${user.id} AND video_id = ${videoId}
            ORDER BY created_at DESC
        `;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result.rows.map((row: any) => ({
            ...row,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
        })) as ExtractedSection[];
    } catch (err) {
        console.error("Error fetching extracted sections:", err);
        return [];
    }
}

export async function deleteExtractedSection(sectionId: number) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // Ensure user owns the section
        const result = await sql`
            DELETE FROM extracted_sections 
            WHERE id = ${sectionId} AND user_id = ${user.id}
        `;
        if (result.rowCount === 0) {
            return { success: false, error: "Section not found or unauthorized" };
        }
        return { success: true };
    } catch (err) {
        console.error("Error deleting extracted section:", err);
        return { success: false, error: "Database error" };
    }
}

export async function renameExtractedSection(sectionId: number, newTitle: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const result = await sql`
            UPDATE extracted_sections 
            SET title = ${newTitle}, updated_at = NOW()
            WHERE id = ${sectionId} AND user_id = ${user.id}
        `;
        if (result.rowCount === 0) {
            return { success: false, error: "Section not found or unauthorized" };
        }
        return { success: true };
    } catch (err) {
        console.error("Error renaming extracted section:", err);
        return { success: false, error: "Database error" };
    }
}

// Musical Flow Canvas Actions

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveFlowCanvas(videoId: number, state: any) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        await sql`
            INSERT INTO musical_flow_canvases (user_id, video_id, canvas_state, updated_at)
            VALUES (${user.id}, ${videoId}, ${state}, NOW())
            ON CONFLICT (video_id) 
            DO UPDATE SET 
                canvas_state = EXCLUDED.canvas_state,
                updated_at = NOW();
        `;
        return { success: true };
    } catch (err) {
        console.error("Error saving flow canvas:", err);
        return { success: false, error: "Database error" };
    }
}

export async function getFlowCanvas(videoId: number) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const result = await sql`
            SELECT canvas_state FROM musical_flow_canvases 
            WHERE video_id = ${videoId}
        `;
        if (result.rows.length > 0) {
            return { success: true, state: result.rows[0].canvas_state };
        }
        return { success: true, state: null };
    } catch (err) {
        console.error("Error fetching flow canvas:", err);
        return { success: false, error: "Database error" };
    }
}

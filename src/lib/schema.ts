import { sql } from '@vercel/postgres';

export async function createVideosTable() {
  try {
    const result = await sql`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        youtube_url TEXT NOT NULL,
        title TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        processing_status VARCHAR(20) DEFAULT 'pending',
        processing_progress INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log(`Created "videos" table`);
    return result;
  } catch (error) {
    console.error('Error creating "videos" table:', error);
    throw error;
  }
}

export async function createStemsTable() {
  try {
    const result = await sql`
        CREATE TABLE IF NOT EXISTS stems (
          id SERIAL PRIMARY KEY,
          video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL, -- e.g., 'vocals', 'drums', 'bass', 'other'
          blob_url TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
    console.log(`Created "stems" table`);
    return result;
  } catch (error) {
    console.error('Error creating "stems" table:', error);
    throw error;
  }
}

export async function createUserJamSettingsTable() {
  try {
    const result = await sql`
        CREATE TABLE IF NOT EXISTS user_jam_settings (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
          pitch INTEGER DEFAULT 0,
          tempo INTEGER DEFAULT 120,
          active_track TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, video_id)
        );
      `;
    console.log(`Created "user_jam_settings" table`);
    return result;
  } catch (error) {
    console.error('Error creating "user_jam_settings" table:', error);
    throw error;
  }
}


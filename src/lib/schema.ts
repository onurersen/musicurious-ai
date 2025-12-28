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

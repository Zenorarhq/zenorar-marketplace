// lib/db.ts
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 1,                // Neon free tier
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000,
});

export default pool;

// Helper for direct SQL queries (used by library API routes)
export async function query(text: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

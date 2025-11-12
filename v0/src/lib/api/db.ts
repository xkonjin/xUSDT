/**
 * Database Connection Utility for Next.js API Routes
 * 
 * Provides serverless-safe database connection pooling for Vercel Postgres.
 * Uses singleton pattern to reuse connections across function invocations.
 */

import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Get database connection pool (singleton pattern for serverless)
 */
export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.GAME_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or GAME_DATABASE_URL environment variable is required");
  }

  // Parse connection string and create pool
  pool = new Pool({
    connectionString: databaseUrl,
    // Serverless-optimized settings
    max: 1, // Single connection per function instance
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: databaseUrl.includes("vercel") || databaseUrl.includes("ssl") 
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // Handle pool errors
  pool.on("error", (err) => {
    console.error("Unexpected database pool error:", err);
  });

  return pool;
}

/**
 * Execute a database query
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getDbPool();
  const start = Date.now();
  
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Database query error";
    console.error("Database query error:", errorMessage);
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount: number }> }) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close database pool (for cleanup/testing)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

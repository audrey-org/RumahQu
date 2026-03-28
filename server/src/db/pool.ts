import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config.js";

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.NODE_ENV === "test" ? 1 : 10,
      ssl: env.DATABASE_SSL
        ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED }
        : undefined,
    });
  }

  return pool;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

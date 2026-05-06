import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Check your .env.local file.");
    }
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    _pool.on("error", (err) => {
      console.error("[db] unexpected pool error:", err.message);
    });
  }
  return _pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pool = {
  end: () => getPool().end(),
  query: (text: string, values?: unknown[]) =>
    getPool().query(text, values as any),
};

export default pool;

// ─── Schema

export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cells (
      idx           INTEGER PRIMARY KEY,
      owner_id      TEXT,
      owner_name    TEXT,
      color         TEXT,
      claimed_at    BIGINT,
      locked_until  BIGINT DEFAULT 0,
      contest_count INTEGER DEFAULT 0
    );
  `);

  // Add new columns if upgrading from old schema
  await pool.query(`
    ALTER TABLE cells ADD COLUMN IF NOT EXISTS locked_until  BIGINT DEFAULT 0;
    ALTER TABLE cells ADD COLUMN IF NOT EXISTS contest_count INTEGER DEFAULT 0;
  `);

  const { rows } = await pool.query(`SELECT COUNT(*) AS cnt FROM cells`);
  if (parseInt(rows[0].cnt, 10) === 0) {
    const TOTAL = parseInt(process.env.GRID_TOTAL ?? "1200", 10);
    const values = Array.from(
      { length: TOTAL },
      (_, i) => `(${i}, NULL, NULL, NULL, NULL, 0, 0)`,
    ).join(",");
    await pool.query(
      `INSERT INTO cells (idx, owner_id, owner_name, color, claimed_at, locked_until, contest_count) VALUES ${values}`,
    );
    console.log(`[db] initialized ${TOTAL} cells`);
  }
}

// ─── Types

export interface DBCell {
  idx: number;
  owner_id: string | null;
  owner_name: string | null;
  color: string | null;
  claimed_at: number | null;
  locked_until: number | null;
  contest_count: number;
}

// ─── Queries

export async function loadGrid(): Promise<DBCell[]> {
  const { rows } = await pool.query(
    `SELECT idx, owner_id, owner_name, color, claimed_at, locked_until, contest_count
       FROM cells ORDER BY idx ASC`,
  );
  return rows as DBCell[];
}

export async function claimCell(
  idx: number,
  ownerId: string,
  ownerName: string,
  color: string,
  claimedAt: number,
  lockedUntil: number,
): Promise<void> {
  await pool.query(
    `UPDATE cells
        SET owner_id = $1, owner_name = $2, color = $3,
            claimed_at = $4, locked_until = $5,
            contest_count = contest_count + 1
      WHERE idx = $6`,
    [ownerId, ownerName, color, claimedAt, lockedUntil, idx],
  );
}

export async function renameUserCells(
  ownerId: string,
  newName: string,
): Promise<void> {
  await pool.query(`UPDATE cells SET owner_name = $1 WHERE owner_id = $2`, [
    newName,
    ownerId,
  ]);
}

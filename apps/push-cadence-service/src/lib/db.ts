import { Pool } from 'pg';

// This setup ensures that in development, the connection pool is persisted across hot-reloads.
declare global {
  // eslint-disable-next-line no-var
  var pool: Pool | undefined;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.PUSH_CADENCE_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
  });
} else {
  if (!global.pool) {
    global.pool = new Pool({
      connectionString: process.env.PUSH_CADENCE_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  pool = global.pool;
}

export default pool;

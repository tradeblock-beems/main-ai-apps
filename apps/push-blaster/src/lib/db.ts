import { Pool } from 'pg';

declare global {
    var pool: Pool;
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  // In production, we trust the connection string and Vercel's environment to handle SSL.
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  // In development, we use a global variable to prevent multiple connections during hot-reloading,
  // and we explicitly disable SSL certificate verification.
  if (!global.pool) {
    global.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }
  pool = global.pool;
}

export default pool; 
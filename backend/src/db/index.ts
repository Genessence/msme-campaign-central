import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a new database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Utility function to execute queries
export const query = async (text: string, params?: any[]) => {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    await query('SELECT NOW()');
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed', error);
  }
};

// Execute test connection
testConnection();

export default {
  query,
  pool,
};
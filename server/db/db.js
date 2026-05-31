import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool to local MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barbo',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection and log success
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to local MySQL Database successfully!');
    conn.release();
  } catch (err) {
    console.error('❌ Failed to connect to MySQL database:', err.message);
    console.log('👉 Make sure you have created the "barbo" database locally and executed server/db/schema.sql');
  }
};

testConnection();

export default pool;

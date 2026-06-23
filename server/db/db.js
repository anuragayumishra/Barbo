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
  queueLimit: 0,
  dateStrings: true
});

// Auto-migrations to ensure schema stays in sync
const runAutoMigrations = async () => {
  try {
    console.log('🔄 Running auto-migrations to align schema...');
    
    // 1. users role update
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('customer', 'barber', 'admin') NOT NULL
    `);
    
    // 2. services.barber_id column
    const [serviceCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'services' 
        AND COLUMN_NAME = 'barber_id'
    `);
    if (serviceCols.length === 0) {
      console.log('➕ Adding column: services.barber_id');
      await pool.query(`
        ALTER TABLE services ADD COLUMN barber_id VARCHAR(50) NULL
      `);
      try {
        await pool.query(`
          ALTER TABLE services 
          ADD CONSTRAINT fk_services_barber 
          FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
        `);
        console.log('✅ Added foreign key constraint fk_services_barber.');
      } catch (fkErr) {
        console.warn('⚠️ Service FK note:', fkErr.message);
      }
    }
    
    // 3. barber_applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barber_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_name VARCHAR(100) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
        maps_url VARCHAR(500) NULL,
        lat DECIMAL(9,6) NOT NULL,
        lon DECIMAL(9,6) NOT NULL,
        chairs_count INT NOT NULL,
        opening_time VARCHAR(10) NOT NULL,
        closing_time VARCHAR(10) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        rejection_feedback TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 4. barber_applications.maps_url column
    const [appCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'barber_applications' 
        AND COLUMN_NAME = 'maps_url'
    `);
    if (appCols.length === 0) {
      console.log('➕ Adding column: barber_applications.maps_url');
      await pool.query(`
        ALTER TABLE barber_applications ADD COLUMN maps_url VARCHAR(500) NULL
      `);
    }

    // 5. application_services table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS application_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        price INT NOT NULL,
        duration_minutes INT NOT NULL,
        FOREIGN KEY (application_id) REFERENCES barber_applications(id) ON DELETE CASCADE
      )
    `);

    // 5.1 Add services.category column
    const [serviceCategoryCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'services' 
        AND COLUMN_NAME = 'category'
    `);
    if (serviceCategoryCols.length === 0) {
      console.log('➕ Adding column: services.category');
      await pool.query(`
        ALTER TABLE services ADD COLUMN category ENUM('men', 'women', 'unisex') DEFAULT 'unisex'
      `);
    }

    // 5.2 Add application_services.category column
    const [appServiceCategoryCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'application_services' 
        AND COLUMN_NAME = 'category'
    `);
    if (appServiceCategoryCols.length === 0) {
      console.log('➕ Adding column: application_services.category');
      await pool.query(`
        ALTER TABLE application_services ADD COLUMN category ENUM('men', 'women', 'unisex') DEFAULT 'unisex'
      `);
    }

    // 6. seed admin user
    await pool.query(`
      INSERT INTO users (id, email, password, name, role, barber_id) VALUES 
      ('admin-user', 'admin@barbo.in', '123456', 'System Admin', 'admin', NULL)
      ON DUPLICATE KEY UPDATE 
        email=VALUES(email),
        password=VALUES(password),
        name=VALUES(name),
        role=VALUES(role),
        barber_id=VALUES(barber_id)
    `);

    // 7. appointments payment columns
    const [aptCols] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'appointments' 
        AND COLUMN_NAME IN ('payment_method', 'payment_status')
    `);
    const aptColNames = aptCols.map(c => c.COLUMN_NAME);
    if (!aptColNames.includes('payment_method')) {
      console.log('➕ Adding column: appointments.payment_method');
      await pool.query(`
        ALTER TABLE appointments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Pay At Shop'
      `);
    }
    if (!aptColNames.includes('payment_status')) {
      console.log('➕ Adding column: appointments.payment_status');
      await pool.query(`
        ALTER TABLE appointments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid'
      `);
    }

    console.log('✅ Auto-migrations completed successfully!');
  } catch (err) {
    console.error('⚠️ Auto-migrations failed:', err.message);
  }
};

// Test connection and log success
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connected to local MySQL Database successfully!');
    conn.release();
    // Run self-healing auto-migrations
    await runAutoMigrations();
  } catch (err) {
    console.error('❌ Failed to connect to MySQL database:', err.message);
    console.log('👉 Make sure you have created the "barbo" database locally and executed server/db/schema.sql');
  }
};

testConnection();

// Prevent idle connection errors from crashing the process
pool.on('error', (err) => {
  console.error('⚠️ Unexpected database pool error:', err.message);
});

// Process-wide crash prevention for unhandled database connection rejections
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ Unhandled promise rejection caught:', reason.message || reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error(`⚠️ Caught exception: ${err}\nException origin: ${origin}`);
});

export default pool;

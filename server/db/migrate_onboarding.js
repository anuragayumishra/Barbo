import pool from './db.js';

const migrate = async () => {
  try {
    console.log('🔄 Checking database schema for onboarding modifications...');

    // 1. Modify users.role column
    console.log('🔄 Modifying users.role to allow "admin"...');
    await pool.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('customer', 'barber', 'admin') NOT NULL
    `);
    console.log('✅ Modified users.role successfully.');

    // 2. Check if services.barber_id exists
    const [serviceColumns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'services' 
        AND COLUMN_NAME = 'barber_id'
    `);

    if (serviceColumns.length === 0) {
      console.log('➕ Adding column services.barber_id...');
      await pool.query(`
        ALTER TABLE services 
        ADD COLUMN barber_id VARCHAR(50) NULL
      `);
      console.log('✅ Added services.barber_id column.');
      
      console.log('➕ Adding foreign key constraint fk_services_barber...');
      await pool.query(`
        ALTER TABLE services 
        ADD CONSTRAINT fk_services_barber 
        FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE
      `);
      console.log('✅ Added foreign key constraint.');
    } else {
      console.log('ℹ️ Column services.barber_id already exists.');
    }

    // 3. Create barber_applications table
    console.log('🔄 Creating table barber_applications...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS barber_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_name VARCHAR(100) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,
        location VARCHAR(255) NOT NULL,
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
    console.log('✅ Table barber_applications created or verified.');

    // 4. Create application_services table
    console.log('🔄 Creating table application_services...');
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
    console.log('✅ Table application_services created or verified.');

    // 5. Seed default admin user
    console.log('🔄 Seeding default admin user...');
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
    console.log('✅ Admin user seeded.');

    console.log('🎉 Onboarding Database Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();

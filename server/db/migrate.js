import pool from './db.js';

const migrate = async () => {
  try {
    console.log('🔄 Checking database schema for payment columns...');
    
    // Check if columns exist by selecting from information_schema
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'appointments' 
         AND COLUMN_NAME IN ('payment_method', 'payment_status')`
    );

    const existingColumns = columns.map(c => c.COLUMN_NAME);
    
    if (!existingColumns.includes('payment_method')) {
      console.log('➕ Adding column: payment_method');
      await pool.query(
        `ALTER TABLE appointments 
         ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Pay At Shop'`
      );
      console.log('✅ Added payment_method column.');
    } else {
      console.log('ℹ️ Column payment_method already exists.');
    }

    if (!existingColumns.includes('payment_status')) {
      console.log('➕ Adding column: payment_status');
      await pool.query(
        `ALTER TABLE appointments 
         ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid'`
      );
      console.log('✅ Added payment_status column.');
    } else {
      console.log('ℹ️ Column payment_status already exists.');
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();

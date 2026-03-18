const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const createLeadsTable = `
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      phone VARCHAR(255),
      email VARCHAR(255),
      name VARCHAR(255),
      purpose VARCHAR(255),
      budget VARCHAR(255),
      timeline VARCHAR(255),
      score INTEGER DEFAULT 0,
      source VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createChatLogsTable = `
    CREATE TABLE IF NOT EXISTS chat_logs (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255),
      role VARCHAR(50),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createAppointmentsTable = `
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      lead_name VARCHAR(255),
      phone VARCHAR(255),
      email VARCHAR(255),
      appointment_date DATE,
      time_slot VARCHAR(100),
      services_booked TEXT,
      total_price INTEGER,
      discount_applied INTEGER,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createServicesTable = `
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      price INTEGER,
      discount_percent INTEGER DEFAULT 0
    );
  `;
  
  const createSettingsTable = `
    CREATE TABLE IF NOT EXISTS settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value VARCHAR(255)
    );
  `;

  try {
    await pool.query(createLeadsTable);
    await pool.query(createChatLogsTable);
    
    // Safely create and potentially alter existing schema if it existed
    await pool.query(createAppointmentsTable);
    try {
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS services_booked TEXT;`);
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS total_price INTEGER;`);
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS discount_applied INTEGER;`);
    } catch(e) {}
    
    await pool.query(createServicesTable);
    await pool.query(createSettingsTable);
    
    // Seed Default Global Discount
    const setRes = await pool.query(`SELECT COUNT(*) FROM settings`);
    if (parseInt(setRes.rows[0].count) === 0) {
      await pool.query(`INSERT INTO settings (setting_key, setting_value) VALUES ('global_discount_max', '15')`);
    }
    
    // Seed Sample Services
    const srvRes = await pool.query(`SELECT COUNT(*) FROM services`);
    if (parseInt(srvRes.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO services (name, description, price, discount_percent) VALUES 
        ('Bridal HD Package', 'Includes HD without airbrush, styling, draping, extensions', 14400, 0),
        ('Regular Party', 'Includes styling, draping, and extensions (No HD)', 3000, 0),
        ('Airbrush Bridal', 'Flawless silicone-based airbrush base', 20000, 5)
      `);
    }
    
    console.log("Database Schema fully updated for Phase 3.");
  } catch (err) {
    console.log('Database init warning/skip (might strictly need DATABASE_URL set):', err.message);
  }
}

module.exports = { pool, initDB };

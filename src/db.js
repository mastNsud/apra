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
      contacted VARCHAR(10) DEFAULT 'No',
      contacted_at TIMESTAMP,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createServicesTable = `
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      description TEXT,
      price INTEGER,
      discount_percent INTEGER DEFAULT 0,
      image_url VARCHAR(500)
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
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contacted VARCHAR(10) DEFAULT 'No';`);
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMP;`);
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS comments TEXT;`);
    } catch(e) {}
    
    await pool.query(createServicesTable);
    try {
      await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);`);
    } catch(e) {}
    await pool.query(createSettingsTable);
    
    // Seed Default Global Discount
    const setRes = await pool.query(`SELECT COUNT(*) FROM settings`);
    if (parseInt(setRes.rows[0].count) === 0) {
      await pool.query(`INSERT INTO settings (setting_key, setting_value) VALUES ('global_discount_max', '15')`);
    }
    
    // Safely Seed Default Services
    const defaultServices = [
      ['Bridal HD Package', 'Includes HD without airbrush, styling, draping, extensions', 14400, 0, 'images/service-1.png'],
      ['Regular Party', 'Includes styling, draping, and extensions (No HD)', 3000, 0, 'images/service-2.png'],
      ['Airbrush Bridal', 'Flawless silicone-based airbrush base', 20000, 5, 'images/service-3.png'],
      ['Engagement Makeup', 'Soft, dewy finish perfect for ring ceremonies.', 8000, 0, 'images/service-4.jpg'],
      ['Pre-Wedding Shoot', 'Long-lasting, photo-ready makeup resisting outdoor elements.', 10000, 0, 'images/service-5.jpg'],
      ['Reception Airbrush Glam', 'Bold expressive eyes and flawless airbrush for night camera flashes.', 15000, 0, 'images/service-6.jpg'],
      ['Haldi / Mehendi Fresh Look', 'Lightweight, sweat-proof base with vibrant colorful vibes.', 6000, 0, 'images/service-7.jpg'],
      ['Premium Family Guest', 'Luxury HD makeup tailored for the brides close family members.', 5000, 0, 'images/service-8.jpg']
    ];

    for (let s of defaultServices) {
      const check = await pool.query('SELECT id FROM services WHERE name = $1', [s[0]]);
      if (check.rows.length === 0) {
        await pool.query(
          'INSERT INTO services (name, description, price, discount_percent, image_url) VALUES ($1, $2, $3, $4, $5)',
          s
        );
      }
    }
    
    console.log("Database Schema fully updated for Phase 3.");
  } catch (err) {
    console.log('Database init warning/skip (might strictly need DATABASE_URL set):', err.message);
  }
}

module.exports = { pool, initDB };

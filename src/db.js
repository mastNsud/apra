const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Needed for Railway postgres instances
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

  try {
    await pool.query(createLeadsTable);
    console.log("Leads table ready.");
    await pool.query(createChatLogsTable);
    console.log("Chat logs table ready.");
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log('Skipping DB setup because no valid DATABASE_URL is configured yet.');
    } else {
      console.error("Database initialization failed:", err);
    }
  }
}

module.exports = { pool, initDB };

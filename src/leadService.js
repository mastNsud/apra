const { pool } = require('./db');

// Calculate a simple score from 0-100 based on captured fields
function calculateScore(data) {
  let score = 0;
  if (data.name) score += 20;
  if (data.phone) score += 20;
  if (data.email) score += 20;
  if (data.purpose) score += 20;
  if (data.budget || data.timeline) score += 20;
  return score;
}

// Upsert a lead. We check if phone or email exists to avoid pure duplicates
async function upsertLead(sessionId, data, source) {
  const score = calculateScore(data);
  const query = `
    INSERT INTO leads (phone, email, name, purpose, budget, timeline, score, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [
    data.phone || null,
    data.email || null,
    data.name || null,
    data.purpose || null,
    data.budget || null,
    data.timeline || null,
    score,
    source,
  ];
  
  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error("Error upserting lead:", err);
    return null;
  }
}

async function logChat(sessionId, role, message) {
  const query = `
    INSERT INTO chat_logs (session_id, role, message)
    VALUES ($1, $2, $3);
  `;
  try {
    await pool.query(query, [sessionId, role, message]);
  } catch (err) {
    console.error("Error logging chat:", err);
  }
}

async function bookAppointment(data) {
  const query = `
    INSERT INTO appointments (lead_name, phone, email, appointment_date, time_slot)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [
    data.lead_name || null,
    data.phone || null,
    data.email || null,
    data.appointment_date || null,
    data.time_slot || null
  ];
  
  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error("Error booking appointment:", err);
    return null;
  }
}

module.exports = { upsertLead, logChat, bookAppointment };

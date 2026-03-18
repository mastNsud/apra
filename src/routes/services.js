const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET all services
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// GET global settings (e.g., max discount)
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'global_discount_max'");
    res.json({ global_discount_max: result.rows.length > 0 ? parseInt(result.rows[0].setting_value) : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Admin: Update setting
router.put('/settings', async (req, res) => {
  const { global_discount_max } = req.body;
  try {
    await pool.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('global_discount_max', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
      [String(global_discount_max)]
    );
    res.json({ success: true, global_discount_max });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Admin: Add new service
router.post('/', async (req, res) => {
  const { name, description, price, discount_percent } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, description, price, discount_percent) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, discount_percent || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Admin: Update existing service
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount_percent } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET name=$1, description=$2, price=$3, discount_percent=$4 WHERE id=$5 RETURNING *',
      [name, description, price, discount_percent || 0, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Admin: Delete service
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;

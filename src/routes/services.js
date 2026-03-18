const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// PUBLIC: GET all services
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// PUBLIC: GET global settings (Frontend needs this for the max discount calculation)
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_value FROM settings WHERE setting_key = 'global_discount_max'");
    res.json({ global_discount_max: result.rows.length > 0 ? parseInt(result.rows[0].setting_value) : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Middleware for Admin Routes
function adminAuth(req, res, next) {
    const pwd = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_PASSWORD || 'apra123';
    if (pwd === expected) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Incorrect password.' });
    }
}

// ADMIN: Update settings
router.put('/settings', adminAuth, async (req, res) => {
  const { global_discount_max } = req.body;
  try {
    await pool.query(
      "INSERT INTO settings (setting_key, setting_value) VALUES ('global_discount_max', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
      [String(global_discount_max)]
    );
    res.json({ success: true, global_discount_max });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ADMIN: Add new service
router.post('/', adminAuth, async (req, res) => {
  const { name, description, price, discount_percent, image_url } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO services (name, description, price, discount_percent, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, price, discount_percent || 0, image_url || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// ADMIN: Update existing service
router.put('/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount_percent, image_url } = req.body;
  try {
    const result = await pool.query(
      'UPDATE services SET name=$1, description=$2, price=$3, discount_percent=$4, image_url=$5 WHERE id=$6 RETURNING *',
      [name, description, price, discount_percent || 0, image_url || '', id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// ADMIN: Delete service
router.delete('/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// ADMIN: GET Leads
router.get('/data/leads', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(result.rows);
    } catch(err) {
        res.status(500).json({error: 'Failed to fetch leads'});
    }
});

// ADMIN: GET Appointments
router.get('/data/appointments', adminAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC');
        res.json(result.rows);
    } catch(err) {
        res.status(500).json({error: 'Failed to fetch appointments'});
    }
});

module.exports = router;

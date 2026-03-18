const express = require('express');
const router = express.Router();
const { bookAppointment } = require('../leadService');

router.post('/', async (req, res) => {
  const { lead_name, phone, email, appointment_date, time_slot } = req.body;
  
  if (!lead_name || !phone || !appointment_date || !time_slot) {
    return res.status(400).json({ error: 'Missing required appointment fields (name, phone, date, time slot).' });
  }

  try {
    const appointment = await bookAppointment({ lead_name, phone, email, appointment_date, time_slot });
    if (appointment) {
      res.status(201).json({ success: true, appointment });
    } else {
      res.status(500).json({ error: 'Failed to save appointment' });
    }
  } catch (err) {
    console.error('API Error booking appointment:', err);
    res.status(500).json({ error: 'Server error booking appointment' });
  }
});

module.exports = router;

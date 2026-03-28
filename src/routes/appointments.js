const express = require('express');
const router = express.Router();
const { bookAppointment, updateAppointment } = require('../leadService');

router.post('/', async (req, res) => {
  const { lead_name, phone, email, appointment_date, time_slot, services_booked, total_price, discount_applied } = req.body;
  
  if (!lead_name || !phone || !appointment_date) {
    return res.status(400).json({ error: 'Missing required appointment fields (name, phone, date).' });
  }

  try {
    const appointment = await bookAppointment({ lead_name, phone, email, appointment_date, time_slot, services_booked, total_price, discount_applied });
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

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { contacted, comments, status } = req.body;

  try {
    const updated = await updateAppointment(id, { contacted, comments, status });
    if (updated) {
      res.json({ success: true, appointment: updated });
    } else {
      res.status(404).json({ error: 'Appointment not found' });
    }
  } catch (err) {
    console.error('API Error updating appointment:', err);
    res.status(500).json({ error: 'Server error updating appointment' });
  }
});

module.exports = router;

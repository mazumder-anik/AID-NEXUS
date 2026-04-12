const express = require('express');
const router  = express.Router();
const db      = require('../db');

function parseVol(v) {
  return { ...v, skills: JSON.parse(v.skills || '[]') };
}

// GET /api/volunteers
router.get('/', (req, res) => {
  const { role, available } = req.query;
  const conditions = [];
  const params     = [];

  if (role !== undefined) { conditions.push('role = ?'); params.push(role); }
  if (available !== undefined) {
    conditions.push('available = ?');
    params.push(available === 'true' ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const vols  = db.prepare(`SELECT * FROM volunteers ${where} ORDER BY name`).all(...params);
  res.json(vols.map(parseVol));
});

// GET /api/volunteers/:id
router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(parseInt(req.params.id));
  if (!v) return res.status(404).json({ error: 'Volunteer not found' });
  res.json(parseVol(v));
});

// POST /api/volunteers
router.post('/', (req, res) => {
  const { name, email, phone, skills, lat, lng, location_name, role, available } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const result = db.prepare(`
    INSERT INTO volunteers (name, email, phone, skills, lat, lng, location_name, role, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), email.trim(), phone || '',
    JSON.stringify(skills || []),
    parseFloat(lat) || 0,
    parseFloat(lng) || 0,
    location_name || '',
    role || 'volunteer',
    available !== false ? 1 : 0
  );

  const v = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(parseVol(v));
});

// PUT /api/volunteers/:id
router.put('/:id', (req, res) => {
  const id  = parseInt(req.params.id);
  const ex  = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id);
  if (!ex) return res.status(404).json({ error: 'Volunteer not found' });

  const { name, email, phone, skills, lat, lng, location_name, available } = req.body;

  db.prepare(`
    UPDATE volunteers SET
      name          = ?,
      email         = ?,
      phone         = ?,
      skills        = ?,
      lat           = ?,
      lng           = ?,
      location_name = ?,
      available     = ?
    WHERE id = ?
  `).run(
    name          !== undefined ? name.trim()             : ex.name,
    email         !== undefined ? email.trim()            : ex.email,
    phone         !== undefined ? phone                   : ex.phone,
    skills        !== undefined ? JSON.stringify(skills)  : ex.skills,
    lat           !== undefined ? parseFloat(lat)         : ex.lat,
    lng           !== undefined ? parseFloat(lng)         : ex.lng,
    location_name !== undefined ? location_name           : ex.location_name,
    available     !== undefined ? (available ? 1 : 0)    : ex.available,
    id
  );

  const v = db.prepare('SELECT * FROM volunteers WHERE id = ?').get(id);
  res.json(parseVol(v));
});

// DELETE /api/volunteers/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM volunteers WHERE id = ?').run(parseInt(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;

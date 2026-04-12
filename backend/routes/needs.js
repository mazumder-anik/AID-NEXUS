const express = require('express');
const router  = express.Router();
const db      = require('../db');

// Urgency computed at query time: severity / max(time_remaining, 0.1)
const URGENCY_EXPR = `ROUND(severity / MAX(time_remaining_hours, 0.1), 4)`;

const BASE_SELECT = `
  SELECT *, ${URGENCY_EXPR} AS urgency_score FROM needs
`;

function parseNeed(n) {
  return { ...n, skills_required: JSON.parse(n.skills_required || '[]') };
}

// GET /api/needs
router.get('/', (req, res) => {
  const { status, category } = req.query;
  const conditions = [];
  const params     = [];

  if (status)   { conditions.push('status = ?');   params.push(status); }
  if (category) { conditions.push('category = ?'); params.push(category); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql   = `${BASE_SELECT} ${where} ORDER BY urgency_score DESC`;

  const needs = db.prepare(sql).all(...params);
  res.json(needs.map(parseNeed));
});

// GET /api/needs/:id
router.get('/:id', (req, res) => {
  const need = db.prepare(`${BASE_SELECT} WHERE id = ?`).get(parseInt(req.params.id));
  if (!need) return res.status(404).json({ error: 'Need not found' });
  res.json(parseNeed(need));
});

// POST /api/needs
router.post('/', (req, res) => {
  const { title, description, category, severity, time_remaining_hours,
          location_lat, location_lng, location_name, skills_required, status } = req.body;

  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

  const result = db.prepare(`
    INSERT INTO needs
      (title, description, category, severity, time_remaining_hours,
       location_lat, location_lng, location_name, skills_required, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description  || '',
    category     || 'other',
    parseFloat(severity)             || 5,
    parseFloat(time_remaining_hours) || 24,
    parseFloat(location_lat)         || 0,
    parseFloat(location_lng)         || 0,
    location_name || '',
    JSON.stringify(skills_required || []),
    status || 'open'
  );

  const need = db.prepare(`${BASE_SELECT} WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json(parseNeed(need));
});

// PUT /api/needs/:id
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = db.prepare('SELECT * FROM needs WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Need not found' });

  const { title, description, category, severity, time_remaining_hours,
          location_lat, location_lng, location_name, skills_required, status } = req.body;

  db.prepare(`
    UPDATE needs SET
      title                = ?,
      description          = ?,
      category             = ?,
      severity             = ?,
      time_remaining_hours = ?,
      location_lat         = ?,
      location_lng         = ?,
      location_name        = ?,
      skills_required      = ?,
      status               = ?
    WHERE id = ?
  `).run(
    title                !== undefined ? title                : existing.title,
    description          !== undefined ? description          : existing.description,
    category             !== undefined ? category             : existing.category,
    severity             !== undefined ? parseFloat(severity) : existing.severity,
    time_remaining_hours !== undefined ? parseFloat(time_remaining_hours) : existing.time_remaining_hours,
    location_lat         !== undefined ? parseFloat(location_lat) : existing.location_lat,
    location_lng         !== undefined ? parseFloat(location_lng) : existing.location_lng,
    location_name        !== undefined ? location_name        : existing.location_name,
    skills_required      !== undefined ? JSON.stringify(skills_required) : existing.skills_required,
    status               !== undefined ? status               : existing.status,
    id
  );

  const need = db.prepare(`${BASE_SELECT} WHERE id = ?`).get(id);
  res.json(parseNeed(need));
});

// DELETE /api/needs/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM needs WHERE id = ?').run(parseInt(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;

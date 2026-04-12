const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const db = require('../db');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

/**
 * Normalise a raw record (from CSV or JSON) into a needs row.
 * Handles multiple column name conventions for resilience.
 */
function normaliseRecord(r) {
  const skillsRaw = r.skills_required || r.skillsRequired || r.skills || r.required_skills || '[]';
  let skills;
  try {
    skills = typeof skillsRaw === 'string' ? skillsRaw : JSON.stringify(skillsRaw);
  } catch {
    skills = '[]';
  }

  return {
    title:               r.title       || r.Title       || r.name    || '',
    description:         r.description || r.Description || r.details || '',
    category:            r.category    || r.Category    || r.type    || 'other',
    severity:            parseFloat(r.severity            || r.Severity            || r.priority || 5),
    time_remaining_hours: parseFloat(r.time_remaining_hours || r.timeRemaining || r.hours || r.deadline || 24),
    location_lat:        parseFloat(r.location_lat || r.lat  || r.latitude  || 0),
    location_lng:        parseFloat(r.location_lng || r.lng  || r.longitude || 0),
    location_name:       r.location_name || r.location || r.area || r.city || '',
    skills_required:     skills
  };
}

// POST /api/survey/upload — parse and bulk-import CSV or JSON survey
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let records = [];
  const ext = req.file.originalname.toLowerCase().split('.').pop();
  const content = req.file.buffer.toString('utf8');

  try {
    if (ext === 'csv') {
      records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } else if (ext === 'json') {
      const parsed = JSON.parse(content);
      records = Array.isArray(parsed) ? parsed : (parsed.needs || parsed.data || [parsed]);
    } else {
      return res.status(400).json({ error: 'Unsupported format. Please upload a .csv or .json file.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'File parse error', detail: err.message });
  }

  const insertNeed = db.prepare(`
    INSERT INTO needs (title, description, category, severity, time_remaining_hours,
                       location_lat, location_lng, location_name, skills_required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let imported = 0;
  let skipped = 0;
  const errors = [];

  records.forEach((r, idx) => {
    try {
      const n = normaliseRecord(r);
      if (!n.title.trim()) { skipped++; return; }
      insertNeed.run(
        n.title, n.description, n.category,
        isNaN(n.severity) ? 5 : n.severity,
        isNaN(n.time_remaining_hours) ? 24 : n.time_remaining_hours,
        isNaN(n.location_lat) ? 0 : n.location_lat,
        isNaN(n.location_lng) ? 0 : n.location_lng,
        n.location_name, n.skills_required
      );
      imported++;
    } catch (err) {
      errors.push({ row: idx + 2, error: err.message });
      skipped++;
    }
  });

  res.json({ success: true, imported, skipped, errors, total: records.length });
});

module.exports = router;

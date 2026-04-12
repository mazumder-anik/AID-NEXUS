const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET /api/verify
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT
      vf.*,
      m.match_score, m.status AS match_status,
      m.need_id, m.volunteer_id,
      n.title         AS need_title,
      n.category,
      n.location_name AS need_location,
      v.name          AS volunteer_name
    FROM verifications vf
    JOIN matches    m  ON vf.match_id    = m.id
    JOIN needs      n  ON m.need_id      = n.id
    JOIN volunteers v  ON m.volunteer_id = v.id
    ORDER BY vf.updated_at DESC
  `).all();
  res.json(rows);
});

// POST /api/verify/:matchId/done — volunteer marks task complete
router.post('/:matchId/done', (req, res) => {
  const { note } = req.body;
  const matchId  = parseInt(req.params.matchId);

  const match = db.prepare('SELECT id FROM matches WHERE id = ?').get(matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Upsert — ON CONFLICT requires SQLite 3.24+, which Node 22+ ships with
  db.prepare(`
    INSERT INTO verifications (match_id, volunteer_marked_done, volunteer_note, updated_at)
    VALUES (?, 1, ?, datetime('now'))
    ON CONFLICT(match_id) DO UPDATE SET
      volunteer_marked_done = 1,
      volunteer_note        = excluded.volunteer_note,
      updated_at            = datetime('now')
  `).run(matchId, note || '');

  res.json({ success: true });
});

// POST /api/verify/:matchId/confirm — NGO confirms completion
router.post('/:matchId/confirm', (req, res) => {
  const { note } = req.body;
  const matchId  = parseInt(req.params.matchId);

  db.prepare(`
    INSERT INTO verifications (match_id, ngo_verified, ngo_note, updated_at)
    VALUES (?, 1, ?, datetime('now'))
    ON CONFLICT(match_id) DO UPDATE SET
      ngo_verified = 1,
      ngo_note     = excluded.ngo_note,
      updated_at   = datetime('now')
  `).run(matchId, note || '');

  // Cascade status to need and match
  const m = db.prepare('SELECT need_id FROM matches WHERE id = ?').get(matchId);
  if (m) {
    db.prepare(`UPDATE needs   SET status = 'verified'  WHERE id = ?`).run(m.need_id);
    db.prepare(`UPDATE matches SET status = 'completed' WHERE id = ?`).run(matchId);
  }

  res.json({ success: true });
});

module.exports = router;

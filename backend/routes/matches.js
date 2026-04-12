const express = require('express');
const router  = express.Router();
const db      = require('../db');

const MATCHER_URL = process.env.MATCHER_URL || 'http://localhost:8080';

// ─── JS Fallback Matching Engine ────────────────────────────────────────────
// Same algorithm as the Java microservice:
//   score = (skillOverlap × 0.6) + (haversineProximity × 0.4)
// Used when the Java service is unavailable.

const MAX_DIST_KM    = 100;
const SKILL_WEIGHT   = 0.6;
const PROX_WEIGHT    = 0.4;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dO = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dL/2)**2 +
             Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dO/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeMatches(needs, volunteers) {
  const results = [];

  for (const need of needs) {
    const required = need.skillsRequired || [];

    for (const vol of volunteers) {
      if (!vol.available) continue;
      const skills = vol.skills || [];

      // Skill overlap
      const skillScore = required.length === 0 ? 1.0
        : required.filter(s => skills.map(x => x.toLowerCase()).includes(s.toLowerCase())).length / required.length;

      // Proximity (Haversine)
      const distKm = haversineKm(need.lat, need.lng, vol.lat, vol.lng);
      const proximityScore = 1 - Math.min(distKm / MAX_DIST_KM, 1);

      const matchScore = (skillScore * SKILL_WEIGHT) + (proximityScore * PROX_WEIGHT);

      if (matchScore > 0.05) {
        results.push({
          needId:         need.id,
          volunteerId:    vol.id,
          matchScore:     Math.round(matchScore     * 10000) / 10000,
          skillScore:     Math.round(skillScore     * 10000) / 10000,
          proximityScore: Math.round(proximityScore * 10000) / 10000
        });
      }
    }
  }

  // Sort descending by match score
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/matches — all with joined need + volunteer data
router.get('/', (req, res) => {
  const matches = db.prepare(`
    SELECT
      m.*,
      n.title         AS need_title,
      n.category,
      n.location_name AS need_location,
      ROUND(n.severity / MAX(n.time_remaining_hours, 0.1), 4) AS urgency_score,
      v.name          AS volunteer_name,
      v.skills        AS volunteer_skills,
      v.location_name AS volunteer_location
    FROM matches m
    JOIN needs      n ON m.need_id      = n.id
    JOIN volunteers v ON m.volunteer_id = v.id
    ORDER BY m.match_score DESC
  `).all();

  res.json(matches.map(m => ({
    ...m,
    volunteer_skills: JSON.parse(m.volunteer_skills || '[]')
  })));
});

// POST /api/matches/run — try Java, fall back to JS engine
router.post('/run', async (req, res) => {
  const needs = db.prepare(`
    SELECT *, ROUND(severity / MAX(time_remaining_hours, 0.1), 4) AS urgency_score
    FROM needs WHERE status = 'open'
  `).all();

  const volunteers = db.prepare(
    `SELECT * FROM volunteers WHERE available = 1 AND role = 'volunteer'`
  ).all();

  if (needs.length === 0)
    return res.json({ success: true, matchesCreated: 0, message: 'No open needs to match' });
  if (volunteers.length === 0)
    return res.json({ success: true, matchesCreated: 0, message: 'No available volunteers' });

  let matches  = [];
  let usedJava = false;

  // ── Try Java microservice first ─────────────────────────────────────────
  try {
    const payload = {
      needs: needs.map(n => ({
        id:             n.id,
        skillsRequired: JSON.parse(n.skills_required || '[]'),
        lat:            n.location_lat,
        lng:            n.location_lng,
        urgencyScore:   n.urgency_score
      })),
      volunteers: volunteers.map(v => ({
        id:        v.id,
        skills:    JSON.parse(v.skills || '[]'),
        lat:       v.lat,
        lng:       v.lng,
        available: v.available === 1
      }))
    };

    const response = await fetch(`${MATCHER_URL}/api/match`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000)   // 5-second timeout
    });

    if (response.ok) {
      const data = await response.json();
      matches  = data.matches;
      usedJava = true;
    }
  } catch {
    // Java service not running — use the JS fallback below
  }

  // ── JS Fallback ──────────────────────────────────────────────────────────
  if (!usedJava) {
    const needsPayload = needs.map(n => ({
      id:             n.id,
      skillsRequired: JSON.parse(n.skills_required || '[]'),
      lat:            n.location_lat,
      lng:            n.location_lng,
      urgencyScore:   n.urgency_score
    }));
    const volsPayload = volunteers.map(v => ({
      id:        v.id,
      skills:    JSON.parse(v.skills || '[]'),
      lat:       v.lat,
      lng:       v.lng,
      available: v.available === 1
    }));
    matches = computeMatches(needsPayload, volsPayload);
  }

  // ── Store top match per need ─────────────────────────────────────────────
  const insertMatch = db.prepare(`
    INSERT OR IGNORE INTO matches
      (need_id, volunteer_id, match_score, skill_score, proximity_score, status, assigned_at)
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `);

  const seenNeeds = new Set();
  let inserted = 0;

  for (const m of matches) {
    if (!seenNeeds.has(m.needId)) {
      insertMatch.run(m.needId, m.volunteerId, m.matchScore, m.skillScore, m.proximityScore);
      seenNeeds.add(m.needId);
      inserted++;
    }
  }

  res.json({
    success:         true,
    engine:          usedJava ? 'java' : 'js-fallback',
    matchesCreated:  inserted,
    totalCandidates: matches.length,
    needsProcessed:  needs.length,
    volunteersPooled: volunteers.length
  });
});

// PUT /api/matches/:id/status
router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'accepted', 'declined', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));

  if (status === 'accepted') {
    const match = db.prepare('SELECT need_id FROM matches WHERE id = ?').get(parseInt(req.params.id));
    if (match) db.prepare(`UPDATE needs SET status = 'in_progress' WHERE id = ?`).run(match.need_id);
  }

  res.json({ success: true });
});

// DELETE /api/matches/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM matches WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

module.exports = router;

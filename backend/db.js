/**
 * db.js — SQLite via Node.js built-in node:sqlite (Node 22+, stable in Node 23+)
 * No npm package needed. Synchronous API, very similar to better-sqlite3.
 *
 * Key API differences from better-sqlite3:
 *   - Pragma via db.exec('PRAGMA ...') instead of db.pragma()
 *   - Named params use $name notation: stmt.all({ $id: 1 })
 *   - Positional params spread as args: stmt.all(val1, val2) or stmt.all(...arr)
 *   - stmt.run() returns { changes, lastInsertRowid }  (same as better-sqlite3)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smart_resource.db');

const db = new DatabaseSync(DB_PATH);

// Performance & integrity pragmas
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA synchronous = NORMAL');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS volunteers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    UNIQUE NOT NULL,
    phone         TEXT    DEFAULT '',
    skills        TEXT    DEFAULT '[]',
    lat           REAL    DEFAULT 0,
    lng           REAL    DEFAULT 0,
    location_name TEXT    DEFAULT '',
    role          TEXT    DEFAULT 'volunteer',
    available     INTEGER DEFAULT 1,
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS needs (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    title                TEXT  NOT NULL,
    description          TEXT  DEFAULT '',
    category             TEXT  DEFAULT 'other',
    severity             REAL  DEFAULT 5.0,
    time_remaining_hours REAL  DEFAULT 24.0,
    location_lat         REAL  DEFAULT 0,
    location_lng         REAL  DEFAULT 0,
    location_name        TEXT  DEFAULT '',
    skills_required      TEXT  DEFAULT '[]',
    status               TEXT  DEFAULT 'open',
    ngo_id               INTEGER REFERENCES volunteers(id),
    created_at           TEXT  DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    need_id         INTEGER REFERENCES needs(id) ON DELETE CASCADE,
    volunteer_id    INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
    match_score     REAL    DEFAULT 0,
    skill_score     REAL    DEFAULT 0,
    proximity_score REAL    DEFAULT 0,
    status          TEXT    DEFAULT 'pending',
    assigned_at     TEXT    DEFAULT (datetime('now')),
    UNIQUE(need_id, volunteer_id)
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id              INTEGER UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    volunteer_marked_done INTEGER DEFAULT 0,
    ngo_verified          INTEGER DEFAULT 0,
    volunteer_note        TEXT    DEFAULT '',
    ngo_note              TEXT    DEFAULT '',
    updated_at            TEXT    DEFAULT (datetime('now'))
  );
`);

// ─── Seeding ──────────────────────────────────────────────────────────────────
function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM volunteers').get().c;
  if (count > 0) return;

  console.log('🌱 Seeding database with sample data...');

  // Seed volunteers
  const volPath = path.join(__dirname, '../seed_data/sample_volunteers.json');
  if (fs.existsSync(volPath)) {
    const vols = JSON.parse(fs.readFileSync(volPath, 'utf8'));
    const ins  = db.prepare(
      `INSERT OR IGNORE INTO volunteers (name, email, phone, skills, lat, lng, location_name, role, available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    vols.forEach(v => ins.run(
      v.name, v.email, v.phone || '',
      JSON.stringify(v.skills || []),
      v.lat || 0, v.lng || 0, v.location_name || '',
      v.role || 'volunteer', v.available ? 1 : 0
    ));
    console.log(`  ✅ Seeded ${vols.length} volunteers`);
  }

  // Seed needs from CSV
  const needsPath = path.join(__dirname, '../seed_data/sample_needs.csv');
  if (fs.existsSync(needsPath)) {
    const { parse } = require('csv-parse/sync');
    const records   = parse(fs.readFileSync(needsPath, 'utf8'), {
      columns: true, skip_empty_lines: true, trim: true
    });

    const ins = db.prepare(
      `INSERT OR IGNORE INTO needs
         (title, description, category, severity, time_remaining_hours,
          location_lat, location_lng, location_name, skills_required)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    records.forEach(r => ins.run(
      r.title, r.description || '', r.category || 'other',
      parseFloat(r.severity)             || 5,
      parseFloat(r.time_remaining_hours) || 24,
      parseFloat(r.location_lat)         || 0,
      parseFloat(r.location_lng)         || 0,
      r.location_name || '', r.skills_required || '[]'
    ));
    console.log(`  ✅ Seeded ${records.length} needs`);
  }
}

seedIfEmpty();

module.exports = db;

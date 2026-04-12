// Test whether node:sqlite built-in is available (Node 22+)
try {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT)');
  db.prepare('INSERT INTO test (val) VALUES (?)').run('hello');
  const row = db.prepare('SELECT * FROM test').get();
  console.log('✅ node:sqlite OK:', JSON.stringify(row));
  db.close();
} catch (err) {
  console.error('❌ node:sqlite failed:', err.message);
  process.exit(1);
}

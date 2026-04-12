const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/needs', require('./routes/needs'));
app.use('/api/volunteers', require('./routes/volunteers'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/verify', require('./routes/verify'));
app.use('/api/survey', require('./routes/survey'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', service: 'backend', timestamp: new Date().toISOString() });
});

// Serve SPA for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Smart Resource API running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/#dashboard`);
  console.log(`🔗 Matcher:   ${process.env.MATCHER_URL || 'http://localhost:8080'}\n`);
});

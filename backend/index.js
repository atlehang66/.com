// backend/index.js
//
// Entry point for your Express backend.
// Place this file directly in your "backend" folder
// (same level as package.json, config/, middleware/).
//
// Run it with: node index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requireAuth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Simple health check — useful for confirming the server is up
// before you even test auth. Visit http://localhost:3000/ in a browser.
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Protected route — requires a valid Supabase session token
// in the Authorization header: "Bearer <access_token>"
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
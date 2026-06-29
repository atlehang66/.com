require('dotenv').config(); // dotenv FIRST, always

const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
const requireAuth = require('./middleware/auth');

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'))); // serves frontend

// --- API Routes ---
app.use('/api/payments', require('./routes/payments'));

// add your other existing routes here e.g.
// app.use('/api/me', requireAuth, require('./routes/me'));

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
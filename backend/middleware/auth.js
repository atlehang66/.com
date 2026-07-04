// backend/middleware/auth.js
//
// Protects routes by verifying the Supabase session token the frontend
// sends after a user logs in. Use it on any route that needs to know
// WHO is making the request (checkout, order history, profile, etc).
//
// Frontend usage (once a user is logged in):
//
//   const { data } = await supabaseClient.auth.getSession();
//   const token = data.session.access_token;
//
//   fetch('http://localhost:3000/api/me', {
//     headers: { Authorization: `Bearer ${token}` }
//   });

const supabase = require('../config/supabaseClient');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  // Asking Supabase to validate this token also confirms it hasn't
  // expired or been tampered with — no manual JWT decoding needed.
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Downstream routes can now read req.user.id / req.user.email
  req.user = data.user;
  next();
}

module.exports = requireAuth;
// backend/config/supabaseClient.js
//
// This connects your Express backend to Supabase.
// Place this file in your backend/config folder.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your .env file'
  );
}

// IMPORTANT: this uses the SERVICE ROLE key, not the anon key.
// The service role key bypasses Row Level Security, which is fine
// here because this client only ever runs on your trusted backend
// server — never send this key to the browser/frontend.
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

// ---------------------------------------------------------
// Example usage elsewhere in your backend, e.g. in a controller:
//
// const supabase = require('../config/supabaseClient');
//
// async function getProducts(req, res) {
//   const { data, error } = await supabase
//     .from('products')
//     .select('*')
//     .eq('is_active', true);
//
//   if (error) return res.status(500).json({ error: error.message });
//   res.json(data);
// }
// ---------------------------------------------------------
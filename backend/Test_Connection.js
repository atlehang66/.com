// backend/test-connection.js
//
// A quick standalone script to confirm your backend can talk to Supabase.
// Run it with: node test-connection.js   (from inside the backend/ folder)

require('dotenv').config();
const supabase = require('./config/supabaseClient');

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // 1. Try fetching the seeded categories — proves the DB query + key work
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*');

  if (catError) {
    console.error('❌ Connection failed:', catError.message);
    process.exit(1);
  }

  console.log('✅ Connected successfully!');
  console.log(`Found ${categories.length} categories:`);
  categories.forEach((c) => console.log(`   - ${c.name} (${c.slug})`));

  // 2. Try fetching products too, just to confirm that table is reachable
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*');

  if (prodError) {
    console.error('\n❌ Could not read products table:', prodError.message);
    process.exit(1);
  }

  console.log(`\nFound ${products.length} products (expected 0 until you add some).`);
  console.log('\n🎉 Your backend is correctly connected to Supabase.');
}

testConnection();
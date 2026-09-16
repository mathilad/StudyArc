const fs = require('fs');
if (!process.env.EXPO_PUBLIC_SUPABASE_URL && typeof process.loadEnvFile === 'function' && fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Supabase public configuration is required');
const source = fs.readFileSync('docs/auth-callback.html', 'utf8');
// JSON escaping prevents environment values from becoming script syntax.
const result = source.replace("'__SUPABASE_URL__'", JSON.stringify(url).replace(/</g, '\\u003c')).replace("'__SUPABASE_KEY__'", JSON.stringify(key).replace(/</g, '\\u003c'));
fs.mkdirSync('public', {recursive: true});
fs.writeFileSync('public/auth-callback.html', result);

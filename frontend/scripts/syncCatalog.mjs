// Pushes src/data/ProductData.json to the backend so the database is updated automatically.
// Local dev can use `python manage.py sync_catalog --watch` instead; this script is for a hosted backend.
import { readFileSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../src/data/ProductData.json', import.meta.url));
const api = process.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
const token = process.env.SYNC_TOKEN;
if (!token) { console.error('Set SYNC_TOKEN (a staff user token) first.'); process.exit(1); }

async function push() {
  try {
    const res = await fetch(`${api}/catalog/sync/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
      body: readFileSync(file, 'utf8'),
    });
    console.log(res.ok ? 'Synced:' : `Failed (${res.status}):`, JSON.stringify(await res.json()));
  } catch (e) { console.error('Sync error:', e.message); }
}

await push();
if (process.argv.includes('--watch')) {
  console.log('Watching ProductData.json ... Ctrl+C to stop');
  let t; watch(file, () => { clearTimeout(t); t = setTimeout(push, 400); });
}

import { fetchHtml, parseFighter, parseOrgEvents, BASE } from './sherdog.js';
import { ROSTER } from './roster.js';

const UFC_ORG = `${BASE}/organizations/Ultimate-Fighting-Championship-UFC-2`;

// Simple in-memory TTL cache (per warm serverless instance).
const cache = new Map();
function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.p;
  const p = Promise.resolve().then(producer).catch((e) => { cache.delete(key); throw e; });
  cache.set(key, { t: Date.now(), p });
  return p;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }));
  return out;
}

const rosterMeta = (id) => ROSTER.find((r) => r.id === String(id));

export function getFighter(id) {
  const meta = rosterMeta(id) || {};
  return cached(`fighter:${id}`, 60 * 60 * 1000, async () => {
    const html = await fetchHtml(`${BASE}/fighter/x-${id}`);
    return parseFighter(html, { id: String(id), division: meta.div || '', rank: meta.rank || null });
  });
}

export function getRoster() {
  return cached('roster', 60 * 60 * 1000, async () => {
    const list = await mapLimit(ROSTER, 6, async (r) => {
      try {
        const f = await getFighter(r.id);
        const { fights, ...summary } = f;
        return summary;
      } catch {
        return { id: r.id, name: r.name, div: r.div, ranked: r.rank, nat: '🌍', record: null, nc: 0, methods: null };
      }
    });
    return list;
  });
}

export function getEvents() {
  return cached('events', 30 * 60 * 1000, async () => {
    const html = await fetchHtml(UFC_ORG);
    return parseOrgEvents(html, { upcoming: 6, past: 10 });
  });
}

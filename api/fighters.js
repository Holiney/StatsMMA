import { getRoster } from './_lib/data.js';

export default async function handler(req, res) {
  try {
    const list = await getRoster();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ fighters: list });
  } catch (e) {
    res.status(502).json({ error: 'Failed to load fighters', detail: e.message });
  }
}

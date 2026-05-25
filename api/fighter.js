import { getFighter } from './_lib/data.js';

export default async function handler(req, res) {
  const id = (req.query?.id || '').toString().replace(/\D/g, '');
  if (!id) return res.status(400).json({ error: 'Missing id' });
  try {
    const fighter = await getFighter(id);
    if (!fighter.name) return res.status(404).json({ error: 'Fighter not found' });
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ fighter });
  } catch (e) {
    res.status(502).json({ error: 'Failed to load fighter', detail: e.message });
  }
}

import { getEvents } from './_lib/data.js';

export default async function handler(req, res) {
  try {
    const events = await getEvents();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
    res.status(200).json(events);
  } catch (e) {
    res.status(502).json({ error: 'Failed to load events', detail: e.message });
  }
}

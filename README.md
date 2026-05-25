# FightBase — MMA Stats PWA

A mobile-first Progressive Web App for browsing MMA fighter records and events,
with live data scraped from [Sherdog](https://www.sherdog.com).

## Features

- 🔍 Real-time fighter search by name, nickname or division
- 👤 Fighter profiles with live record, win-rate, win-method breakdown and full fight history
- 📅 Recent & upcoming UFC events (live)
- 🔗 Tap any opponent in a fight history to open their profile
- 📱 Installable PWA (add to home screen)
- ✈️ Offline support via Service Worker

## How data works

The front end is a static PWA that calls serverless API routes under `/api`,
which scrape Sherdog on demand (Node.js + Cheerio) and cache the results:

- `GET /api/fighters` — roster summaries (record + win methods)
- `GET /api/fighter?id=<sherdogId>` — full profile + fight history
- `GET /api/events` — recent & upcoming UFC events

The roster (which fighters appear, their division and rank label) is curated in
`api/_lib/roster.js`. Records, methods and fight history are always pulled live —
labels are the only static part. Responses are cached in-memory per warm instance
and at the edge via `Cache-Control` headers.

## Stack

- Vanilla JS / HTML / CSS front end (no build step)
- Vercel serverless functions + Cheerio for scraping
- PWA manifest + Service Worker (network-first for `/api`, cache-first shell)

## Local dev

```bash
npm install
npm run dev        # serves the site and runs the API at http://localhost:3000
```

## Maintaining the roster

Edit the `SEED` list in `scripts/resolve-roster.mjs` (name, division, rank — plus
an optional forced Sherdog ID when search can't surface a fighter), then:

```bash
npm run resolve-roster   # re-resolves Sherdog IDs into api/_lib/roster.js
```

## Deployment

Deploy to **Vercel** — it serves the static files and the `/api` functions
together (same origin, so no CORS). `vercel.json` sets the function timeout for
the scraping routes.

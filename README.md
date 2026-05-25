# FightBase — MMA Stats PWA

A mobile-first Progressive Web App for browsing MMA fighter records and events.

## Features

- 🔍 Real-time fighter search by name, nickname or division
- 👤 Fighter profiles with full fight history and win methods
- 📅 Event results and upcoming cards
- 📱 Installable PWA (add to home screen)
- ✈️ Offline support via Service Worker

## Stack

- Vanilla JS / HTML / CSS — no build step needed
- PWA manifest + Service Worker for offline
- Dark theme with Barlow font family

## Roadmap

- [ ] Backend scraper (Node.js + Cheerio) to pull live data from Sherdog
- [ ] Search by record filters (W/L/method)
- [ ] Fighter comparison view
- [ ] Push notifications for upcoming events
- [ ] Ranking pages per division

## Local dev

Just open `index.html` in a browser, or run a local server:

```bash
npx serve .
```

## Deployment

Deploy to Vercel, Netlify, or GitHub Pages — static site, no backend required for current mock-data version.

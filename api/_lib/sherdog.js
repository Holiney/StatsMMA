import * as cheerio from 'cheerio';

const BASE = 'https://www.sherdog.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const FLAGS = {
  'United States': '🇺🇸', 'Russia': '🇷🇺', 'Brazil': '🇧🇷', 'Ireland': '🇮🇪',
  'Georgia': '🇬🇪', 'Armenia': '🇦🇲', 'Nigeria': '🇳🇬', 'New Zealand': '🇳🇿',
  'Cameroon': '🇨🇲', 'France': '🇫🇷', 'England': '🏴', 'United Kingdom': '🇬🇧',
  'Australia': '🇦🇺', 'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'China': '🇨🇳',
  'South Korea': '🇰🇷', 'Japan': '🇯🇵', 'Poland': '🇵🇱', 'Kazakhstan': '🇰🇿',
  'Dagestan': '🇷🇺', 'Cuba': '🇨🇺', 'Spain': '🇪🇸', 'Sweden': '🇸🇪',
  'South Africa': '🇿🇦', 'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿', 'Germany': '🇩🇪',
  'Netherlands': '🇳🇱', 'Suriname': '🇸🇷', 'Ecuador': '🇪🇨', 'Italy': '🇮🇹',
};

export function flagFor(country) {
  return FLAGS[country] || '🌍';
}

export async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) throw new Error(`Sherdog ${res.status} for ${url}`);
  return res.text();
}

const normalizeName = (s) => (s || '')
  .toLowerCase()
  .replace(/[.'`’]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// Resolve a fighter name to its Sherdog path (/fighter/Name-ID) via fight finder.
// Sherdog returns surname matches alphabetically, so pick the exact-name row.
export async function searchFighter(name) {
  const url = `${BASE}/stats/fightfinder?SearchTxt=${encodeURIComponent(name)}`;
  const $ = cheerio.load(await fetchHtml(url));
  const candidates = [];
  $('table').each((_, t) => {
    const head = $(t).find('tr').first().text().replace(/\s+/g, ' ').trim();
    if (!/Fighter\s+Nickname\s+Height\s+Weight/i.test(head)) return;
    $(t).find('tr').slice(1).each((__, tr) => {
      const a = $(tr).find('a[href^="/fighter/"]').first();
      const href = a.attr('href');
      if (href) candidates.push({ name: a.text().trim(), path: href });
    });
  });
  if (!candidates.length) return null;
  const want = normalizeName(name);
  const exact = candidates.find(c => normalizeName(c.name) === want);
  return (exact || candidates[0]).path;
}

export function idFromPath(path) {
  const m = /(\d+)$/.exec(path || '');
  return m ? m[1] : null;
}

function cleanMethod(raw) {
  // Keep only the bold method text, drop referee / play-by-play.
  return (raw || '').replace(/\s+/g, ' ').trim();
}

function classifyResult(txt) {
  const t = (txt || '').toLowerCase();
  if (t.startsWith('win')) return 'W';
  if (t.startsWith('loss')) return 'L';
  if (t.startsWith('draw')) return 'D';
  return 'NC';
}

// Summarise a method string into KO / Submission / Decision buckets.
function methodBucket(method) {
  const m = (method || '').toLowerCase();
  if (m.includes('ko') || m.includes('tko')) return 'KO';
  if (m.includes('submission') || m.includes('choke') || m.includes('lock') || m.includes('tap')) return 'Sub';
  if (m.includes('decision')) return 'Dec';
  return 'Other';
}

export function parseFighter(html, { id, division = '', rank = null } = {}) {
  const $ = cheerio.load(html);

  const name = $('h1 .fn').first().text().trim();
  const nick = $('.nickname em').first().text().trim();
  const nationality = $('strong[itemprop="nationality"]').first().text().trim();
  const birth = $('[itemprop="birthDate"]').first().text().trim();

  let weight = division;
  $('.association-class a').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (href.includes('weightclass=')) weight = $(a).text().trim();
  });

  // Record: each .winloses block has a label span and a count span.
  let wins = 0, losses = 0, draws = 0, nc = 0;
  $('.winsloses-holder .winloses').each((_, el) => {
    const spans = $(el).find('span');
    const label = $(spans[0]).text().trim().toLowerCase();
    const count = parseInt($(spans[1]).text().trim(), 10) || 0;
    if (label.startsWith('win')) wins = count;
    else if (label.startsWith('los')) losses = count;
    else if (label.startsWith('draw')) draws = count;
    else if (label.startsWith('n')) nc = count;
  });

  // Win-by meters: first three .pl values under the wins column are KO / Sub / Dec.
  const winsCol = $('.winsloses-holder .wins .pl').map((_, e) => parseInt($(e).text().trim(), 10) || 0).get();
  const methods = { KO: winsCol[0] || 0, Sub: winsCol[1] || 0, Dec: winsCol[2] || 0 };

  // Fight history.
  const fights = [];
  $('table.new_table.fighter').first().find('tr').slice(1).each((_, tr) => {
    const td = $(tr).find('td');
    if (td.length < 6) return;
    const r = classifyResult($(td[0]).find('.final_result').text().trim() || $(td[0]).text().trim());
    const oppA = $(td[1]).find('a').first();
    const opp = oppA.text().trim() || $(td[1]).text().trim();
    const oppId = idFromPath(oppA.attr('href'));
    const event = $(td[2]).find('a').first().text().trim() || $(td[2]).clone().children().remove().end().text().trim();
    const date = $(td[2]).find('.sub_line').text().trim();
    const method = cleanMethod($(td[3]).find('b').first().text());
    const round = $(td[4]).text().trim();
    const time = $(td[5]).text().trim();
    fights.push({ r, opp, oppId, event, date, method, round, time });
  });

  return {
    id, name, nick, nat: flagFor(nationality), country: nationality, birth,
    div: weight, ranked: rank, record: [wins, losses, draws], nc,
    methods, fights,
  };
}

function splitEventName(name) {
  const i = name.indexOf(' - ');
  if (i === -1) return { title: name, headline: '' };
  return { title: name.slice(0, i).trim(), headline: name.slice(i + 3).trim() };
}

// Parse a Sherdog organization page (e.g. UFC) into recent + upcoming events.
export function parseOrgEvents(html, { upcoming = 6, past = 10 } = {}) {
  const $ = cheerio.load(html);
  const all = [];
  $('table.new_table.event tr').each((_, tr) => {
    const a = $(tr).find('a[href^="/events/"]').first();
    const href = a.attr('href');
    if (!href) return;
    const name = a.text().replace(/\s+/g, ' ').trim();
    const date = $(tr).find('meta[itemprop="startDate"]').attr('content') || '';
    const loc = $(tr).find('td').last().text().replace(/\s+/g, ' ').trim();
    const { title, headline } = splitEventName(name);
    all.push({ id: idFromPath(href), path: href, name, title, headline, date, location: loc });
  });

  const now = Date.now();
  const dated = all.filter(e => e.date);
  const up = dated.filter(e => new Date(e.date).getTime() >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, upcoming)
    .map(e => ({ ...e, status: 'upcoming' }));
  const pastEv = dated.filter(e => new Date(e.date).getTime() < now)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, past)
    .map(e => ({ ...e, status: 'past' }));
  return { upcoming: up, past: pastEv };
}

export { BASE, methodBucket };

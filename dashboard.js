(() => {
'use strict';

const DEFAULT_LOCATION = { name: 'Hlučín', lat: 49.8986, lon: 18.1914 };

const LINKS = [
  { group: 'Denně', items: [
    { name: 'Gmail',        url: 'https://mail.google.com', pin: true },
    { name: 'iCloud',       url: 'https://www.icloud.com', pin: true },
    { name: 'Google Disk',  url: 'https://drive.google.com' },
    { name: 'Mapy.cz',      url: 'https://mapy.cz', pin: true },
    { name: 'Wikipedie',    url: 'https://cs.wikipedia.org' },
  ]},
  { group: 'Práce a vývoj', items: [
    { name: 'GitHub',         url: 'https://github.com', pin: true },
    { name: 'Claude',         url: 'https://claude.ai', pin: true },
    { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
    { name: 'MDN Web Docs',   url: 'https://developer.mozilla.org' },
    { name: 'npm',            url: 'https://www.npmjs.com' },
    { name: 'Cloudflare',     url: 'https://dash.cloudflare.com' },
  ]},
  { group: 'Zprávy', items: [
    { name: 'ČT24',           url: 'https://ct24.ceskatelevize.cz' },
    { name: 'iDNES.cz',       url: 'https://www.idnes.cz' },
    { name: 'Seznam Zprávy',  url: 'https://www.seznamzpravy.cz' },
    { name: 'Hacker News',    url: 'https://news.ycombinator.com' },
  ]},
  { group: 'Zábava', items: [
    { name: 'YouTube', url: 'https://www.youtube.com', pin: true },
    { name: 'Netflix', url: 'https://www.netflix.com' },
    { name: 'Spotify', url: 'https://open.spotify.com' },
    { name: 'Twitch',  url: 'https://www.twitch.tv' },
    { name: 'Reddit',  url: 'https://www.reddit.com' },
  ]},
  { group: 'Nákupy', items: [
    { name: 'Alza',       url: 'https://www.alza.cz' },
    { name: 'Heureka',    url: 'https://www.heureka.cz' },
    { name: 'Zásilkovna', url: 'https://www.zasilkovna.cz' },
  ]},
];

const DAYS = 7;

const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtTime = d => d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  kids.flat().filter(c => c != null).forEach(c => n.append(c));
  return n;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* úložiště nemusí být dostupné */ } },
};

const DEFAULTS = { calendars: [], proxy: '', autoLocation: true, city: '', cityCoords: null };
let settings = Object.assign({}, DEFAULTS, store.get('dash.settings', {}));

const ICON = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  partly: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1M2 8h1M3.8 3.8l.7.7M12.2 3.8l-.7.7"/><path d="M19 20h-7.5a3.5 3.5 0 1 1 .7-6.93A4.8 4.8 0 0 1 21 15.5 2.25 2.25 0 0 1 19 20z"/>',
  rain: '<path d="M16 13v8M8 13v8M12 15v8"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
  snow: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01"/>',
  storm: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><path d="M13 11l-4 6h6l-4 6"/>',
  fog: '<path d="M4 8h16M2 12h20M5 16h14M8 20h8"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const ico = (n, s = 24) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
function iconEl(n, s, cls = '') { const w = el('span', { class: 'ico ' + cls }); w.innerHTML = ico(n, s); return w; }

let sun = { rise: null, set: null };
let lastMin = -1, lastDayKey = '';

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

function updateGreeting(d) {
  const h = d.getHours();
  const g = h < 5 ? 'Dobrou noc' : h < 10 ? 'Dobré ráno' : h < 12 ? 'Dobré dopoledne' : h < 18 ? 'Dobré odpoledne' : h < 22 ? 'Dobrý večer' : 'Dobrou noc';
  $('#greeting').textContent = g;
}

function updatePhase() {
  const now = new Date();
  const m = now.getHours() * 60 + now.getMinutes();
  const sr = sun.rise ?? 420, ss = sun.set ?? 1140;
  let p = 'day';
  if (m < sr - 45 || m >= ss + 60) p = 'night';
  else if (m < sr + 90) p = 'dawn';
  else if (m >= ss - 90) p = 'dusk';
  document.documentElement.dataset.phase = p;
}

function renderDate(d) {
  const txt = d.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#date').replaceChildren(document.createTextNode(txt), el('span', { class: 'week', text: `${isoWeek(d)}. týden` }));
}

function tick() {
  const d = new Date();
  $('#hm').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  $('#sec').textContent = pad(d.getSeconds());
  if (d.getMinutes() !== lastMin) { lastMin = d.getMinutes(); updateGreeting(d); updatePhase(); }
  const key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
  if (key !== lastDayKey) { lastDayKey = key; renderDate(d); recompute(); renderAgenda(); }
}

const WMO = {
  0: ['Jasno', 'sun'], 1: ['Převážně jasno', 'sun'], 2: ['Polojasno', 'partly'], 3: ['Zataženo', 'cloud'],
  45: ['Mlha', 'fog'], 48: ['Namrzající mlha', 'fog'],
  51: ['Slabé mrholení', 'rain'], 53: ['Mrholení', 'rain'], 55: ['Husté mrholení', 'rain'],
  56: ['Namrzající mrholení', 'rain'], 57: ['Namrzající mrholení', 'rain'],
  61: ['Slabý déšť', 'rain'], 63: ['Déšť', 'rain'], 65: ['Silný déšť', 'rain'],
  66: ['Namrzající déšť', 'rain'], 67: ['Namrzající déšť', 'rain'],
  71: ['Slabé sněžení', 'snow'], 73: ['Sněžení', 'snow'], 75: ['Silné sněžení', 'snow'], 77: ['Sněhová zrna', 'snow'],
  80: ['Přeháňky', 'rain'], 81: ['Silnější přeháňky', 'rain'], 82: ['Prudké přeháňky', 'rain'],
  85: ['Sněhové přeháňky', 'snow'], 86: ['Silné sněhové přeháňky', 'snow'],
  95: ['Bouřka', 'storm'], 96: ['Bouřka s kroupami', 'storm'], 99: ['Silná bouřka s kroupami', 'storm'],
};
function wxInfo(code, isDay = 1) {
  const [label, icon] = WMO[code] || ['Neznámé počasí', 'cloud'];
  let i = icon;
  if (!isDay && i === 'sun') i = 'moon';
  if (!isDay && i === 'partly') i = 'cloud';
  return { label, icon: i };
}

let weatherData = null, lastWeather = 0;

async function reverseName(lat, lon) {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=cs`);
    const j = await r.json();
    return j.city || j.locality || null;
  } catch { return null; }
}

async function getCoords() {
  const fallback = () => settings.cityCoords || DEFAULT_LOCATION;
  if (!settings.autoLocation) return fallback();
  const cached = store.get('dash.geo', null);
  if (cached && Date.now() - cached.t < 6 * 3600e3) return cached.loc;
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, maximumAge: 3600e3 }));
    const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: null };
    loc.name = await reverseName(loc.lat, loc.lon);
    store.set('dash.geo', { t: Date.now(), loc });
    return loc;
  } catch { return fallback(); }
}

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

async function loadWeather() {
  try {
    const loc = await getCoords();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}`
      + `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset`
      + `&timezone=auto&forecast_days=6`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    weatherData = { loc, j, t: new Date() };
    lastWeather = Date.now();
    sun.rise = toMin(j.daily.sunrise[0].slice(11, 16));
    sun.set = toMin(j.daily.sunset[0].slice(11, 16));
    renderWeather();
    updatePhase();
  } catch (e) {
    if (!weatherData) renderWeatherError();
  }
}

function renderWeatherError() {
  $('#weather').replaceChildren(
    el('p', { class: 'w-msg' }, 'Počasí se nepodařilo načíst. Zkontroluj připojení k internetu. '),
    el('button', { class: 'link-btn', type: 'button', onclick: loadWeather }, 'Zkusit znovu'),
  );
}

function renderWeather() {
  const { loc, j, t } = weatherData;
  const c = j.current, d = j.daily;
  const info = wxInfo(c.weather_code, c.is_day);
  const r = Math.round;

  const days = el('ul', { class: 'w-days' });
  for (let i = 1; i < d.time.length && i <= 5; i++) {
    const wd = new Date(d.time[i] + 'T12:00').toLocaleDateString('cs-CZ', { weekday: 'short' });
    days.append(el('li', {},
      el('span', { class: 'wd', text: wd }),
      iconEl(wxInfo(d.weather_code[i]).icon, 26),
      el('span', { class: 'hi', text: r(d.temperature_2m_max[i]) + '°' }),
      el('span', { class: 'lo', text: r(d.temperature_2m_min[i]) + '°' }),
    ));
  }

  const metric = (label, value) => el('div', {}, el('dt', { text: label }), el('dd', { text: value }));

  $('#weather').replaceChildren(
    el('div', { class: 'w-top' },
      el('span', { class: 'loc' }, iconEl('pin', 16), loc.name || 'Moje poloha'),
      el('span', { text: 'Aktualizováno ' + fmtTime(t) }),
    ),
    el('div', { class: 'w-main' },
      el('div', { class: 'w-temp', text: r(c.temperature_2m) + '°' }),
      iconEl(info.icon, 64, 'w-icon'),
    ),
    el('p', { class: 'w-desc' }, info.label, el('small', { text: 'Pocitově ' + r(c.apparent_temperature) + '°' })),
    el('dl', { class: 'w-metrics' },
      metric('Vítr', r(c.wind_speed_10m) + ' km/h'),
      metric('Vlhkost', c.relative_humidity_2m + ' %'),
      metric('Srážky dnes', (d.precipitation_probability_max[0] ?? 0) + ' %'),
      metric('Dnes', r(d.temperature_2m_max[0]) + '° / ' + r(d.temperature_2m_min[0]) + '°'),
    ),
    days,
    el('div', { class: 'w-sun' },
      el('span', { text: 'Východ slunce ' + d.sunrise[0].slice(11, 16) }),
      el('span', { text: 'Západ slunce ' + d.sunset[0].slice(11, 16) }),
    ),
  );
}

const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
let calRaw = [], occ = [], calState = 'loading', calFail = 0, lastCal = 0;

function tzOffset(ms, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ms));
  const o = {};
  parts.forEach(p => { o[p.type] = +p.value; });
  return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms;
}
function zoned(y, mo, d, h, mi, s, tz) {
  try {
    const guess = Date.UTC(y, mo - 1, d, h, mi, s);
    const off = tzOffset(guess, tz);
    let t = guess - off;
    const off2 = tzOffset(t, tz);
    if (off2 !== off) t = guess - off2;
    return new Date(t);
  } catch { return new Date(y, mo - 1, d, h, mi, s); }
}
function parseDate(v, params) {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (m[4] === undefined) return new Date(y, mo - 1, d);
  const h = +m[4], mi = +m[5], s = +m[6];
  if (m[7]) return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (params && params.TZID) return zoned(y, mo, d, h, mi, s, params.TZID);
  return new Date(y, mo - 1, d, h, mi, s);
}
function parseRule(v) {
  const r = {};
  v.split(';').forEach(p => { const [k, val] = p.split('='); r[k] = val; });
  return {
    freq: r.FREQ,
    interval: +r.INTERVAL || 1,
    count: r.COUNT ? +r.COUNT : null,
    until: r.UNTIL ? parseDate(r.UNTIL, {}) : null,
    byday: r.BYDAY ? r.BYDAY.split(',').map(s => {
      const m = s.match(/^([+-]?\d+)?(MO|TU|WE|TH|FR|SA|SU)$/);
      return m ? { n: m[1] ? +m[1] : 0, d: WD[m[2]] } : null;
    }).filter(Boolean) : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(',').map(Number) : null,
  };
}
const unescapeText = s => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');

function parseICS(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = { ex: [], title: '' }; continue; }
    if (line === 'END:VEVENT') { if (cur && cur.start && cur.status !== 'CANCELLED') events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const [name, ...pp] = line.slice(0, idx).split(';');
    const value = line.slice(idx + 1);
    const params = {};
    pp.forEach(p => { const [k, v] = p.split('='); params[k.toUpperCase()] = v; });
    switch (name.toUpperCase()) {
      case 'SUMMARY': cur.title = unescapeText(value); break;
      case 'LOCATION': cur.location = unescapeText(value).split('\n')[0]; break;
      case 'UID': cur.uid = value; break;
      case 'STATUS': cur.status = value.toUpperCase(); break;
      case 'DTSTART': cur.start = parseDate(value, params); cur.allDay = params.VALUE === 'DATE' || value.length === 8; break;
      case 'DTEND': cur.end = parseDate(value, params); break;
      case 'RRULE': cur.rrule = parseRule(value); break;
      case 'RECURRENCE-ID': cur.recId = parseDate(value, params); break;
      case 'EXDATE': value.split(',').forEach(v => { const d = parseDate(v, params); if (d) cur.ex.push(d.getTime()); }); break;
    }
  }
  const ovr = new Set(events.filter(e => e.recId).map(e => e.uid + '|' + e.recId.getTime()));
  events.forEach(e => { e.ovr = ovr; });
  return events;
}

function weekdaysInMonth(y, m, wd, n) {
  const out = [];
  const last = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= last; d++) if (new Date(y, m, d).getDay() === wd) out.push(d);
  if (!n) return out;
  const i = n > 0 ? n - 1 : out.length + n;
  return out[i] ? [out[i]] : [];
}

function* gen(ev) {
  const r = ev.rrule, s = ev.start, iv = r.interval;
  const H = s.getHours(), Mi = s.getMinutes(), Se = s.getSeconds();
  const mk = (y, m, d) => new Date(y, m, d, H, Mi, Se);
  const Y = s.getFullYear(), Mo = s.getMonth(), D = s.getDate();
  if (r.freq === 'DAILY') {
    for (let i = 0; i < 6000; i++) yield mk(Y, Mo, D + i * iv);
  } else if (r.freq === 'WEEKLY') {
    const days = (r.byday && r.byday.length ? r.byday.map(b => b.d) : [s.getDay()])
      .map(d => (d + 6) % 7).sort((a, b) => a - b);
    const base = D - ((s.getDay() + 6) % 7);
    for (let i = 0; i < 1500; i++) for (const off of days) yield mk(Y, Mo, base + i * iv * 7 + off);
  } else if (r.freq === 'MONTHLY') {
    for (let i = 0; i < 1500; i++) {
      const b = new Date(Y, Mo + i * iv, 1);
      const yy = b.getFullYear(), mm = b.getMonth();
      let dates = [];
      if (r.byday && r.byday.length) {
        r.byday.forEach(x => { dates.push(...weekdaysInMonth(yy, mm, x.d, x.n)); });
      } else {
        dates = (r.bymonthday || [D]).slice();
      }
      dates.sort((a, c) => a - c);
      for (const day of dates) { const t = mk(yy, mm, day); if (t.getMonth() === mm) yield t; }
    }
  } else if (r.freq === 'YEARLY') {
    for (let i = 0; i < 500; i++) { const t = mk(Y + i * iv, Mo, D); if (t.getMonth() === Mo) yield t; }
  }
}

function expand(ev, from, to) {
  const dur = ev.end ? ev.end - ev.start : (ev.allDay ? 86400000 : 0);
  const out = [];
  const push = st => out.push({
    title: ev.title, location: ev.location, allDay: !!ev.allDay,
    start: st, end: new Date(st.getTime() + dur),
  });
  if (!ev.rrule) {
    if (ev.start < to && ev.start.getTime() + Math.max(dur, 1) > from) push(ev.start);
    return out;
  }
  let count = 0;
  for (const st of gen(ev)) {
    if (st < ev.start) continue;
    if (ev.rrule.until && st > ev.rrule.until) break;
    count++;
    if (ev.rrule.count && count > ev.rrule.count) break;
    if (st >= to) break;
    if (st.getTime() + Math.max(dur, 1) <= from) continue;
    if (ev.ex.includes(st.getTime())) continue;
    if (ev.uid && ev.ovr && ev.ovr.has(ev.uid + '|' + st.getTime())) continue;
    push(st);
  }
  return out;
}

function recompute() {
  const from = startOfDay(new Date());
  const to = addDays(from, DAYS);
  occ = [];
  for (const ev of calRaw) occ.push(...expand(ev, from, to));
  occ.sort((a, b) => a.start - b.start);
}

function viaProxy(url) {
  const p = settings.proxy;
  if (!p) return url;
  return p.includes('{url}') ? p.replace('{url}', encodeURIComponent(url)) : p + encodeURIComponent(url);
}
async function fetchCal(raw) {
  const url = raw.trim().replace(/^webcal:/i, 'https:');
  const res = await fetch(viaProxy(url), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Odpověď není kalendář');
  return text;
}

function demoEvents() {
  const d0 = startOfDay(new Date());
  const at = (dd, h, m) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + dd, h, m);
  const timed = (title, s, e, location) => ({ title, start: s, end: e, allDay: false, ex: [], location });
  return [
    timed('Porada týmu', at(0, 9, 0), at(0, 9, 45)),
    timed('Oběd', at(0, 12, 0), at(0, 13, 0)),
    timed('Telefonát s dodavatelem', at(0, 16, 30), at(0, 17, 0)),
    { title: 'Svátek v rodině', start: at(1, 0, 0), end: at(2, 0, 0), allDay: true, ex: [] },
    timed('Zubař', at(1, 8, 15), at(1, 9, 0)),
    timed('Trénink', at(3, 18, 0), at(3, 19, 30)),
  ];
}

async function loadCalendar() {
  lastCal = Date.now();
  if (!settings.calendars.length) {
    calState = 'demo'; calFail = 0; calRaw = demoEvents();
    recompute(); renderAgenda();
    return;
  }
  const results = await Promise.allSettled(settings.calendars.map(fetchCal));
  const ok = results.filter(r => r.status === 'fulfilled');
  calFail = results.length - ok.length;
  if (!ok.length) {
    calState = 'error';
    if (!calRaw.length || calState === 'demo') calRaw = [];
  } else {
    calState = 'ok';
    calRaw = ok.flatMap(r => parseICS(r.value));
  }
  recompute(); renderAgenda();
}

function relTime(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `za ${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `za ${h} h ${m} min` : `za ${h} h`;
}

function renderAgenda() {
  const body = $('#agendaBody');
  const nextEl = $('#nextUp');
  body.replaceChildren();
  nextEl.textContent = '';
  if (calState === 'loading') { body.append(el('p', { class: 'note', text: 'Načítám kalendář…' })); return; }

  const now = new Date(), today = startOfDay(now);

  if (calState === 'demo') {
    body.append(el('p', { class: 'note' }, 'Ukázková data. ',
      el('button', { class: 'link-btn', type: 'button', onclick: openSettings }, 'Připojit svůj kalendář')));
  }
  if (calFail) {
    body.append(el('p', { class: 'note warn' },
      (calState === 'error' ? 'Kalendář se nepodařilo načíst. ' : 'Část kalendářů se nepodařilo načíst. '),
      'Prohlížeč pravděpodobně blokuje přímé stažení z iCloudu. Zkus v nastavení přidat adresu proxy. ',
      el('button', { class: 'link-btn', type: 'button', onclick: openSettings }, 'Otevřít nastavení')));
  }

  const running = occ.find(e => !e.allDay && e.start <= now && e.end > now);
  const next = occ.find(e => !e.allDay && e.start > now);
  if (running) nextEl.textContent = 'Právě probíhá: ' + running.title;
  else if (next) {
    const ms = next.start - now;
    nextEl.textContent = ms < 86400000
      ? `Další ${relTime(ms)}: ${next.title}`
      : `Další ${next.start.toLocaleDateString('cs-CZ', { weekday: 'long' })} v ${fmtTime(next.start)}: ${next.title}`;
  }

  let any = false;
  for (let i = 0; i < DAYS; i++) {
    const ds = addDays(today, i), de = addDays(today, i + 1);
    const list = occ
      .filter(e => e.start < de && Math.max(e.end.getTime(), e.start.getTime() + 1) > ds)
      .sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start));
    if (list.length) any = true;
    if (!list.length && i > 0) continue;

    const name = i === 0 ? 'Dnes' : i === 1 ? 'Zítra' : capital(ds.toLocaleDateString('cs-CZ', { weekday: 'long' }));
    const dateTxt = ds.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
    const ul = el('ul', { class: 'evs' });

    if (!list.length) {
      ul.append(el('li', { class: 'ev' }, el('span', { class: 'ev-time' }), el('span', { class: 'ev-title', text: 'Nic v plánu' })));
    }
    for (const e of list) {
      const isNow = !e.allDay && e.start <= now && e.end > now;
      const isPast = !e.allDay && i === 0 && e.end <= now;
      let time;
      if (e.allDay) time = el('span', { class: 'ev-time', text: 'Celý den' });
      else if (e.start < ds) time = el('span', { class: 'ev-time', text: 'Pokračuje' });
      else time = el('span', { class: 'ev-time' }, fmtTime(e.start),
        e.end > e.start ? el('span', { class: 'ev-end', text: 'do ' + fmtTime(e.end) }) : null);
      ul.append(el('li', { class: 'ev' + (isNow ? ' now' : '') + (isPast ? ' past' : '') },
        time,
        el('div', {},
          el('span', { class: 'ev-title', text: e.title || '(bez názvu)' }),
          e.location ? el('span', { class: 'ev-loc', text: e.location }) : null),
      ));
    }
    body.append(el('div', { class: 'day' },
      el('div', { class: 'day-head' }, el('h3', { text: name }), el('span', { text: dateTxt })),
      ul));
  }
  if (!any && calState === 'ok') {
    body.append(el('p', { class: 'note', text: `Na následujících ${DAYS} dní tu nic není.` }));
  }
}

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

function favEl(it) {
  const wrap = el('span', { class: 'fav' });
  const img = el('img', {
    src: 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(host(it.url)),
    alt: '', loading: 'lazy', width: '28', height: '28',
  });
  img.addEventListener('error', () => { wrap.textContent = it.name.charAt(0).toUpperCase(); });
  wrap.append(img);
  return wrap;
}

function buildLinks() {
  const tiles = $('#tiles');
  let total = 0;
  LINKS.forEach(g => g.items.forEach(it => {
    total++;
    if (it.pin) tiles.append(el('a', { class: 'tile', href: it.url, rel: 'noopener' }, favEl(it), it.name));
  }));
  $('#linkCount').textContent = total + ' odkazů';

  const groups = $('#groups');
  LINKS.forEach(g => {
    const ul = el('ul', {});
    g.items.forEach(it => ul.append(el('li', { 'data-q': (it.name + ' ' + host(it.url) + ' ' + g.group).toLowerCase() },
      el('a', { class: 'row', href: it.url, rel: 'noopener' },
        favEl(it), el('span', { class: 'name', text: it.name }), el('span', { class: 'host', text: host(it.url) })))));
    groups.append(el('section', { class: 'group' }, el('h3', { text: g.group }), ul));
  });
}

function filterMenu(q) {
  q = q.trim().toLowerCase();
  let any = false;
  document.querySelectorAll('#groups .group').forEach(sec => {
    let vis = 0;
    sec.querySelectorAll('li').forEach(li => {
      const show = !q || li.dataset.q.includes(q);
      li.hidden = !show;
      if (show) vis++;
    });
    sec.hidden = !vis;
    if (vis) any = true;
  });
  $('#noResults').hidden = any;
}

const menu = $('#menu'), modal = $('#settings'), search = $('#search');
let lastFocus = null;

function openMenu() {
  lastFocus = document.activeElement;
  menu.inert = false;
  menu.classList.add('open');
  document.body.classList.add('lock');
  search.value = '';
  filterMenu('');
  setTimeout(() => search.focus(), 40);
}
function closeMenu() {
  menu.classList.remove('open');
  menu.inert = true;
  document.body.classList.remove('lock');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function openSettings() {
  lastFocus = document.activeElement;
  $('#setCals').value = settings.calendars.join('\n');
  $('#setProxy').value = settings.proxy;
  $('#setAuto').checked = settings.autoLocation;
  $('#setCity').value = settings.city || '';
  $('#setMsg').textContent = '';
  modal.inert = false;
  modal.classList.add('open');
  document.body.classList.add('lock');
  setTimeout(() => $('#setCals').focus(), 40);
}
function closeSettings() {
  modal.classList.remove('open');
  modal.inert = true;
  if (!menu.classList.contains('open')) document.body.classList.remove('lock');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

async function saveSettings(e) {
  e.preventDefault();
  const msg = $('#setMsg');
  msg.textContent = '';
  const city = $('#setCity').value.trim();
  let cityCoords = settings.cityCoords;

  if (!city) cityCoords = null;
  else if (city !== settings.city || !cityCoords) {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=cs`);
      const j = await r.json();
      if (!j.results || !j.results.length) { msg.textContent = 'Město „' + city + '“ jsem nenašel. Zkontroluj název.'; return; }
      cityCoords = { name: j.results[0].name, lat: j.results[0].latitude, lon: j.results[0].longitude };
    } catch { msg.textContent = 'Město se nepodařilo vyhledat. Zkontroluj připojení.'; return; }
  }

  settings.calendars = $('#setCals').value.split(/\n+/).map(s => s.trim()).filter(Boolean);
  settings.proxy = $('#setProxy').value.trim();
  settings.autoLocation = $('#setAuto').checked;
  settings.city = city;
  settings.cityCoords = cityCoords;
  store.set('dash.settings', settings);
  store.set('dash.geo', null);

  closeSettings();
  weatherData = null;
  $('#weather').replaceChildren(el('p', { class: 'w-msg', text: 'Načítám počasí…' }));
  calState = 'loading'; renderAgenda();
  loadWeather();
  loadCalendar();
}

$('#openSettings').innerHTML = ico('sliders', 22);
$('#closeMenu').innerHTML = ico('close', 22);
$('#gridIco').innerHTML = ico('grid', 20);

buildLinks();

$('#openMenu').addEventListener('click', openMenu);
$('#closeMenu').addEventListener('click', closeMenu);
$('#openSettings').addEventListener('click', openSettings);
$('#setCancel').addEventListener('click', closeSettings);
$('#setForm').addEventListener('submit', saveSettings);
menu.addEventListener('click', e => { if (e.target === menu || e.target.classList.contains('sheet-inner')) closeMenu(); });
modal.addEventListener('click', e => { if (e.target === modal) closeSettings(); });
search.addEventListener('input', () => filterMenu(search.value));
search.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const first = document.querySelector('#groups li:not([hidden]) a');
    if (first) first.click();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modal.classList.contains('open')) closeSettings();
    else if (menu.classList.contains('open')) closeMenu();
    return;
  }
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey
      && !menu.classList.contains('open') && !modal.classList.contains('open')) {
    e.preventDefault();
    openMenu();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  tick();
  renderAgenda();
  if (Date.now() - lastWeather > 5 * 60e3) loadWeather();
  if (Date.now() - lastCal > 3 * 60e3) loadCalendar();
});

tick();
setInterval(tick, 1000);
loadWeather();
loadCalendar();
setInterval(loadWeather, 15 * 60e3);
setInterval(loadCalendar, 10 * 60e3);
setInterval(renderAgenda, 30e3);
})();

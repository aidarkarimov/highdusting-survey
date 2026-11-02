// HighDusting site survey app. Vanilla JS, data in localStorage, photos in IndexedDB.

const UI = {
  appTitle: 'Site survey',
  newSurvey: 'New survey',
  noSurveys: 'No surveys yet. Tap "New survey" on site.',
  settings: 'Settings',
  back: 'Back',
  summary: 'Summary',
  photos: 'Photos',
  notes: 'Notes',
  next: 'Next',
  prev: 'Back',
  estimate: 'Approximate estimate',
  plusTax: '+ tax',
  answered: 'answered',
  untitled: 'Untitled',
  delete: 'Delete',
  confirmDelete: 'Delete this survey and its photos?',
  myLocation: 'Locate me',
  openMap: 'Open map',
  locating: 'Locating…',
  locFail: 'Could not locate. Enter the address manually.',
  addPhoto: 'Take / add photo',
  morePhotos: 'Other photos',
  photoHint: 'Shot list: checks off when you take it',
  breakdown: 'Price breakdown',
  flags: 'Important',
  forgot: 'Not asked yet',
  allAsked: 'All key questions answered',
  uncertain: 'Unknown',
  uncertainNote: 'price inputs are empty or unknown, so the range is wider.',
  clientPdf: 'Client estimate (PDF)',
  shareOffice: 'Send to office',
  copied: 'Copied to clipboard',
  saved: 'Saved',
  ratesTitle: 'Rates (CAD)',
  ratesNote: 'Defaults are based on public Canadian market data (see docs/research.md). Replace with your own; stored on this device.',
  resetRates: 'Reset to defaults',
  company: 'Company',
  estimator: 'Estimator name',
  signIn: 'Sign in',
  whoAreYou: 'Who is doing the survey?',
  enterPin: 'Enter your PIN',
  createPin: 'Create a 4-digit PIN',
  repeatPin: 'Repeat the PIN',
  pinMismatch: 'PINs do not match, try again',
  wrongPin: 'Wrong PIN',
  firstTime: 'First sign-in on this device',
  signOut: 'Sign out',
  switchUser: 'Change',
  theme: 'Theme',
  themeAuto: 'Auto (as device)',
  themeLight: 'Light',
  themeDark: 'Dark',
  phone: 'Phone',
  email: ['Email', 'Email'],
  total: 'Total',
  suggestedDays: 'Suggested from area and height',
  days: 'days',
  exportData: 'Download all surveys (backup)',
  notesPh: 'Anything else: client wishes, site specifics…',
  duplicate: 'Duplicate',
  copyOf: 'Copy: ',
};

// ---------- state & storage ----------
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};
let settings = { company: 'HighDusting.ca', phone: '(888) 451-DUST (3878)', email: 'info@highdusting.ca', estimator: '', theme: 'auto', ...store.get('hd.settings', {}) };
let rates = mergeDeep(structuredClone(DEFAULT_RATES), store.get('hd.rates', {}));
let surveys = store.get('hd.surveys', {});
const L = (pair) => (Array.isArray(pair) ? pair[1] : pair);
const T = (k) => L(UI[k]);

// ---------- theme ----------
const darkMQ = matchMedia('(prefers-color-scheme: light)');
function currentTheme() { const t = settings.theme || 'auto'; return t === 'auto' ? (darkMQ.matches ? 'light' : 'dark') : t; }
function applyTheme() {
  const t = currentTheme();
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#ffffff' : '#0f1720');
}
function setTheme(t) { settings.theme = t; store.set('hd.settings', settings); applyTheme(); }
darkMQ.addEventListener?.('change', applyTheme);
applyTheme();

// ---------- sign-in ----------
// Simple on-device sign-in: PINs are stored as hashes in this browser only.
// It keeps estimators' surveys apart on a shared tablet; it is not server-side security.
let session = store.get('hd.session', null);
const currentUser = () => USERS.find(u => u.id === session?.user) || null;
const userName = (id) => (USERS.find(u => u.id === id) || {}).name || '';
async function pinHash(user, pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`hd:${user}:${pin}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function signOut() { session = null; localStorage.removeItem('hd.session'); go('#/'); route(); }

function mergeDeep(base, over) {
  for (const k in over) {
    if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k]) mergeDeep(base[k], over[k]);
    else base[k] = over[k];
  }
  return base;
}
function saveSurveys() { store.set('hd.surveys', surveys); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// IndexedDB for photos
const db = new Promise((res, rej) => {
  const r = indexedDB.open('hd', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('photos');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function idb(mode, fn) {
  const d = await db;
  return new Promise((res, rej) => {
    const tx = d.transaction('photos', mode);
    const req = fn(tx.objectStore('photos'));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
}
const photoPut = (id, blob) => idb('readwrite', s => s.put(blob, id));
const photoGet = (id) => idb('readonly', s => s.get(id));
const photoDel = (id) => idb('readwrite', s => s.delete(id));
const urlCache = {};
async function photoUrl(id) {
  if (urlCache[id]) return urlCache[id];
  const b = await photoGet(id);
  return b ? (urlCache[id] = URL.createObjectURL(b)) : '';
}

async function compress(file) {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', 0.72));
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 1800);
}

// ---------- helpers ----------
function isAnswered(it, v) {
  if (it.type === 'qty') return v && (v.on === false || (v.on && (it.unit === 'area' || parseFloat(v.qty) > 0)));
  if (it.type === 'multi') return Array.isArray(v) && v.length > 0;
  if (it.type === 'address') return v && v.text;
  return v !== undefined && v !== '' && v !== null;
}
function sectionProgress(sec, a) {
  const done = sec.items.filter(it => isAnswered(it, a[it.id])).length;
  return { done, total: sec.items.length };
}
function forgotten(a) {
  const out = [];
  for (const sec of CHECKLIST) for (const it of sec.items) {
    if (it.important && (!isAnswered(it, a[it.id]) || a[it.id] === 'unknown')) out.push({ sec, it, unknown: a[it.id] === 'unknown' });
  }
  return out;
}
function surveyTitle(s) {
  const a = s.answers;
  return a.clientName || (a.address && a.address.text) || T('untitled');
}

// Surveys made before sign-in existed have no owner: everyone sees them.
function canSee(s) { return !s.owner || s.owner === session?.user; }
function estimatorOf(s) { return userName(s.owner) || currentUser()?.name || ''; }

function renderLogin(picked) {
  const pins = store.get('hd.pins', {});
  const u = USERS.find(x => x.id === picked);
  if (!u) {
    app.innerHTML = `
      <main class="wrap login">
        <div class="brand login-brand"><img src="icon.svg" alt=""><div><b>HighDusting</b><small>${T('appTitle')}</small></div></div>
        <h2>${T('whoAreYou')}</h2>
        <div class="login-users">${USERS.map(x => `<button class="chip user-btn" data-user="${x.id}"><span class="avatar">${esc(x.name[0])}</span>${esc(x.name)}</button>`).join('')}</div>
      </main>`;
    app.querySelectorAll('[data-user]').forEach(b => b.onclick = () => renderLogin(b.dataset.user));
    return;
  }
  const isNew = !pins[u.id];
  let first = null;
  const draw = (title, note, err) => {
    app.innerHTML = `
      <main class="wrap login">
        <button class="ghost" id="back">${ic('chevron-left')}${T('back')}</button>
        <div class="login-who"><span class="avatar big">${esc(u.name[0])}</span><h2>${esc(u.name)}</h2>
          ${note ? `<p class="hint">${note}</p>` : ''}</div>
        <label class="lbl">${title}</label>
        <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" class="pin">
        <p class="pin-err">${err || ''}</p>
      </main>`;
    app.querySelector('#back').onclick = () => renderLogin();
    const inp = app.querySelector('#pin');
    inp.focus();
    inp.oninput = async () => {
      inp.value = inp.value.replace(/\D/g, '').slice(0, 4);
      if (inp.value.length < 4) return;
      const h = await pinHash(u.id, inp.value);
      if (!isNew) {
        if (h === pins[u.id]) return enter();
        return draw(T('enterPin'), '', T('wrongPin'));
      }
      if (!first) { first = h; return draw(T('repeatPin'), T('firstTime')); }
      if (h !== first) { first = null; return draw(T('createPin'), T('firstTime'), T('pinMismatch')); }
      pins[u.id] = h; store.set('hd.pins', pins); enter();
    };
  };
  const enter = () => { session = { user: u.id }; store.set('hd.session', session); route(); };
  draw(isNew ? T('createPin') : T('enterPin'), isNew ? T('firstTime') : '');
}

// ---------- router ----------
const app = document.getElementById('app');
window.addEventListener('hashchange', route);
function go(h) { location.hash = h; }

function route() {
  document.documentElement.lang = 'en';
  if (!currentUser()) return renderLogin();
  const [, view, id, sub] = location.hash.split('/');
  if (view === 'e' && surveys[id] && canSee(surveys[id])) {
    if (sub === 'print') return renderPrint(surveys[id]);
    return renderSurvey(surveys[id], sub || CHECKLIST[0].id);
  }
  if (view === 'settings') return renderSettings();
  renderHome();
}

// ---------- home ----------
function renderHome() {
  const list = Object.values(surveys).filter(canSee).sort((a, b) => b.updated - a.updated);
  app.innerHTML = `
    <header class="top"><div class="brand"><img src="icon.svg" alt=""><div><b>HighDusting</b><small class="who">${ic('user')} ${esc(currentUser().name)}</small></div></div>
      <div class="top-actions"><button class="ghost icon-btn" id="themeBtn" title="${T('theme')}" aria-label="${T('theme')}">${ic(currentTheme() === 'light' ? 'moon' : 'sun')}</button>
      <button class="ghost icon-btn" data-go="#/settings" title="${T('settings')}" aria-label="${T('settings')}">${ic('settings')}</button>
      <button class="ghost" id="outBtn">${ic('log-out')}<span class="hide-xs">${T('signOut')}</span></button></div></header>
    <main class="wrap">
      <button class="primary big" id="new">${ic('plus')} ${T('newSurvey')}</button>
      ${list.length ? '' : `<p class="empty">${T('noSurveys')}</p>`}
      <ul class="cards">${list.map(s => {
        const e = calcEstimate(s.answers, rates);
        const done = CHECKLIST.reduce((n, sec) => n + sectionProgress(sec, s.answers).done, 0);
        const all = CHECKLIST.reduce((n, sec) => n + sec.items.length, 0);
        return `<li class="card" data-go="#/e/${s.id}">
          <div class="card-main"><b>${esc(surveyTitle(s))}</b>
          <small>${esc(s.answers.address?.text || '')}</small>
          <small>${new Date(s.updated).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })} · ${done}/${all} ${T('answered')}</small></div>
          <div class="card-price">${e.total ? `${money(e.low)}<br>– ${money(e.high)}` : '—'}</div></li>`;
      }).join('')}</ul>
    </main>`;
  app.querySelector('#outBtn').onclick = signOut;
  app.querySelector('#themeBtn').onclick = () => { setTheme(currentTheme() === 'light' ? 'dark' : 'light'); renderHome(); };
  app.querySelector('#new').onclick = () => {
    const id = uid();
    surveys[id] = { id, owner: session.user, created: Date.now(), updated: Date.now(), answers: { structure: { on: true } }, photos: [], notes: '' };
    saveSurveys(); go(`#/e/${id}/site`);
  };
  bindGo();
}
function bindGo() { app.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go)); }

// ---------- survey ----------
function renderSurvey(s, secId) {
  const tabs = [...CHECKLIST.map(c => ({ id: c.id, icon: c.icon, title: c.title })),
    { id: 'photos', icon: 'camera', title: UI.photos }, { id: 'notes', icon: 'file-text', title: UI.notes }, { id: 'summary', icon: 'calculator', title: UI.summary }];
  const idx = Math.max(0, tabs.findIndex(t => t.id === secId));
  const sec = tabs[idx];
  app.innerHTML = `
    <header class="top"><button class="ghost" data-go="#/">${ic('chevron-left')}${T('back')}</button>
      <div class="top-title">${esc(surveyTitle(s))}</div>
      <button class="ghost danger icon-btn" id="del" title="${T('delete')}" aria-label="${T('delete')}">${ic('trash')}</button></header>
    <div class="shell"><nav class="tabs" id="tabs">${tabs.map((t, i) => `<button class="tab ${i === idx ? 'on' : ''}" data-tab="${t.id}"><span class="tab-l">${ic(t.icon)}${L(t.title)}</span><span class="tick" data-tick="${t.id}"></span></button>`).join('')}</nav>
    <main class="wrap" id="body"></main></div>
    <footer class="bar" id="bar"></footer>`;
  app.querySelector('#del').onclick = async () => {
    if (!confirm(T('confirmDelete'))) return;
    for (const p of s.photos) await photoDel(p.id).catch(() => {});
    delete surveys[s.id]; saveSurveys(); go('#/');
  };
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go(`#/e/${s.id}/${b.dataset.tab}`));
  app.querySelector('.tab.on').scrollIntoView({ inline: 'center', block: 'nearest' });
  bindGo();

  const body = app.querySelector('#body');
  if (sec.id === 'photos') renderPhotos(s, body);
  else if (sec.id === 'notes') renderNotes(s, body);
  else if (sec.id === 'summary') renderSummary(s, body);
  else renderSection(s, CHECKLIST.find(c => c.id === sec.id), body);

  if (sec.id !== 'summary') {
    const nav = document.createElement('div'); nav.className = 'pager';
    nav.innerHTML = `${idx > 0 ? `<button class="ghost" data-go="#/e/${s.id}/${tabs[idx - 1].id}">${ic('chevron-left')}${T('prev')}</button>` : '<span></span>'}
      <button class="primary" data-go="#/e/${s.id}/${tabs[idx + 1].id}">${T('next')}${ic('chevron-right')}</button>`;
    body.appendChild(nav); bindGo();
  }
  updateBar(s);
  window.scrollTo(0, 0);
}

function touch(s) { s.updated = Date.now(); saveSurveys(); updateBar(s); }

function updateBar(s) {
  const e = calcEstimate(s.answers, rates);
  const bar = document.getElementById('bar');
  if (bar) bar.innerHTML = `<div><small>${T('estimate')}</small><b>${e.total ? `${money(e.low)} – ${money(e.high)}` : '—'}</b>
    <small>${[e.total ? `${T('plusTax')} ${e.taxRate}%` : '', e.unknowns.length ? `${T('uncertain')}: ${e.unknowns.length}` : ''].filter(Boolean).join(' · ')}</small></div>
    <button class="primary" onclick="go('#/e/${s.id}/summary')">${T('summary')} ${ic('chevron-right')}</button>`;
  for (const sec of CHECKLIST) {
    const el = document.querySelector(`[data-tick="${sec.id}"]`);
    if (!el) continue;
    const p = sectionProgress(sec, s.answers);
    el.innerHTML = p.done === p.total ? ic('check', 'ok-ic') : `${p.done}/${p.total}`;
  }
  const ph = document.querySelector('[data-tick="photos"]');
  if (ph) ph.textContent = s.photos.length ? ` ${s.photos.length}` : '';
  const title = document.querySelector('.top-title');
  if (title) title.textContent = surveyTitle(s);
}

function renderSection(s, sec, body) {
  body.innerHTML = `<h2 class="h-ic">${ic(sec.icon)}${L(sec.title)}</h2>${sec.intro ? `<p class="intro">${L(sec.intro)}</p>` : ''}<div class="items"></div>`;
  const box = body.querySelector('.items');
  for (const it of sec.items) {
    const el = document.createElement('div');
    el.className = 'item' + (['textarea', 'address', 'multi'].includes(it.type) || (it.options && it.options.length > 4) ? ' wide' : ''); el.dataset.item = it.id;
    box.appendChild(el);
    renderItem(s, it, el);
  }
}

function renderItem(s, it, el) {
  const a = s.answers, v = a[it.id];
  const set = (val, rerender) => { a[it.id] = val; touch(s); if (rerender) renderItem(s, it, el); markDone(); };
  const markDone = () => el.classList.toggle('done', !!isAnswered(it, a[it.id]) && a[it.id] !== 'unknown');
  const label = `<label class="lbl">${L(it.label)}${it.important ? ' <i class="req">•</i>' : ''}</label>${it.hint ? `<div class="hint">${L(it.hint)}</div>` : ''}`;
  const unit = it.unit ? (Array.isArray(it.unit) ? L(it.unit) : it.unit) : '';
  let html = '';
  switch (it.type) {
    case 'text': case 'tel': case 'email': case 'date':
      html = `<input type="${it.type}" value="${esc(v)}" ${it.type === 'tel' ? 'inputmode="tel"' : ''}>`; break;
    case 'textarea':
      html = `<textarea rows="3">${esc(v)}</textarea>`; break;
    case 'number': {
      let extra = '';
      if (it.id === 'liftDays') {
        const e = calcEstimate(a, rates);
        extra = `<div class="hint">${T('suggestedDays')}: <b>${e.suggestedDays} ${T('days')}</b></div>`;
      }
      html = `<div class="num"><input type="number" inputmode="decimal" min="0" step="any" value="${esc(v)}"><span>${unit}</span></div>${extra}`; break;
    }
    case 'select':
      html = `<div class="chips col">${it.options.map(o => `<button type="button" class="chip ${v === o.v ? 'on' : ''}" data-v="${o.v}">${L(o.l)}</button>`).join('')}</div>`; break;
    case 'multi':
      html = `<div class="chips col">${it.options.map(o => `<button type="button" class="chip ${(v || []).includes(o.v) ? 'on' : ''}" data-v="${o.v}">${L(o.l)}</button>`).join('')}</div>`; break;
    case 'yn':
      html = `<div class="chips">${YN.map(o => `<button type="button" class="chip ${v === o.v ? 'on' : ''} ${o.v}" data-v="${o.v}">${L(o.l)}</button>`).join('')}</div>`; break;
    case 'qty': {
      const on = v && v.on;
      html = `<div class="chips"><button type="button" class="chip ${on ? 'on yes' : ''}" data-q="1">${L('Yes, include')}</button>
        <button type="button" class="chip ${v && v.on === false ? 'on' : ''}" data-q="0">${L('No')}</button></div>
        ${on && it.unit !== 'area' ? `<div class="num"><input type="number" inputmode="numeric" min="0" step="any" value="${esc(v.qty)}" placeholder="0"><span>${unit}</span>
          <button type="button" class="step" data-d="-1" aria-label="minus">${ic('minus')}</button><button type="button" class="step" data-d="1" aria-label="plus">${ic('plus')}</button></div>` : ''}`; break;
    }
    case 'address': {
      const t = v?.text || '';
      const map = v?.lat ? `https://maps.google.com/?q=${v.lat},${v.lon}` : t ? `https://maps.google.com/?q=${encodeURIComponent(t)}` : '';
      html = `<textarea rows="2" placeholder="123 Industrial Rd, Toronto, ON">${esc(t)}</textarea>
        <div class="row"><button type="button" class="ghost" data-loc>${ic('locate')}${T('myLocation')}</button>
        ${map ? `<a class="ghost" href="${map}" target="_blank" rel="noopener">${ic('external')} ${T('openMap')}</a>` : ''}</div>`; break;
    }
  }
  el.innerHTML = label + html;
  markDone();

  // bind
  const inp = el.querySelector('input,textarea');
  if (it.type === 'qty') {
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
      const on = b.dataset.q === '1';
      set({ on, qty: on ? (v?.qty || '') : '' }, true);
      if (on) el.querySelector('input')?.focus();
    });
    if (inp) inp.oninput = () => { a[it.id] = { on: true, qty: inp.value }; touch(s); markDone(); };
    el.querySelectorAll('.step').forEach(b => b.onclick = () => {
      const n = Math.max(0, (parseFloat(inp.value) || 0) + Number(b.dataset.d));
      inp.value = n; a[it.id] = { on: true, qty: String(n) }; touch(s); markDone();
    });
  } else if (it.type === 'address') {
    inp.oninput = () => { a.address = { ...(a.address || {}), text: inp.value }; touch(s); markDone(); };
    inp.onchange = () => renderItem(s, it, el);
    el.querySelector('[data-loc]').onclick = () => locate(s, it, el);
  } else if (inp) {
    inp.oninput = () => { a[it.id] = inp.value; touch(s); markDone(); };
  } else {
    el.querySelectorAll('.chip').forEach(b => b.onclick = () => {
      if (it.type === 'multi') {
        let arr = [...(a[it.id] || [])];
        arr = arr.includes(b.dataset.v) ? arr.filter(x => x !== b.dataset.v) : [...arr, b.dataset.v];
        if (b.dataset.v === 'nothing') arr = arr.includes('nothing') ? ['nothing'] : [];
        else arr = arr.filter(x => x !== 'nothing');
        set(arr, true);
      } else set(a[it.id] === b.dataset.v ? '' : b.dataset.v, true);
    });
  }
}

function locate(s, it, el) {
  if (!navigator.geolocation) return toast(T('locFail'));
  toast(T('locating'));
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    let text = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`);
      const j = await r.json();
      if (j.display_name) {
        const ad = j.address || {};
        text = [[ad.house_number, ad.road].filter(Boolean).join(' '), ad.city || ad.town || ad.village, ad.state, ad.postcode].filter(Boolean).join(', ') || j.display_name;
        const cityName = (ad.city || ad.town || '').toLowerCase();
        const match = CITIES.find(c => c.v !== 'other' && cityName.includes(c.v.slice(0, 5)));
        if (match && !s.answers.city) s.answers.city = match.v;
      }
    } catch { /* offline: keep coordinates */ }
    s.answers.address = { text, lat, lon };
    touch(s); renderSurvey(s, 'site');
  }, () => toast(T('locFail')), { enableHighAccuracy: true, timeout: 15000 });
}

// ---------- photos ----------
async function renderPhotos(s, body) {
  const byPrompt = (pid) => s.photos.filter(p => p.prompt === pid);
  body.innerHTML = `<h2 class="h-ic">${ic('camera')}${T('photos')}</h2><p class="intro">${T('photoHint')}</p>
    <div class="items">${[...PHOTO_PROMPTS, { id: 'other', l: UI.morePhotos }].map(p => `
      <div class="item ${byPrompt(p.id).length ? 'done' : ''}"><label class="lbl">${L(p.l)}</label>
        <div class="thumbs" data-thumbs="${p.id}"></div>
        <label class="ghost file">${ic('camera')}${T('addPhoto')}<input type="file" accept="image/*" capture="environment" multiple data-prompt="${p.id}" hidden></label>
      </div>`).join('')}</div>`;
  body.querySelectorAll('input[type=file]').forEach(inp => inp.onchange = async () => {
    for (const f of inp.files) {
      const id = uid();
      await photoPut(id, await compress(f));
      s.photos.push({ id, prompt: inp.dataset.prompt, at: Date.now() });
    }
    touch(s); renderSurvey(s, 'photos');
  });
  for (const p of s.photos) {
    const box = body.querySelector(`[data-thumbs="${p.prompt}"]`);
    if (!box) continue;
    const d = document.createElement('div'); d.className = 'thumb';
    d.innerHTML = `<img src="${await photoUrl(p.id)}" alt=""><button type="button" title="${T('delete')}" aria-label="${T('delete')}">${ic('x')}</button>`;
    d.querySelector('img').onclick = () => window.open(urlCache[p.id]);
    d.querySelector('button').onclick = async () => {
      await photoDel(p.id); s.photos = s.photos.filter(x => x.id !== p.id); touch(s); renderSurvey(s, 'photos');
    };
    box.appendChild(d);
  }
}

function renderNotes(s, body) {
  body.innerHTML = `<h2 class="h-ic">${ic('file-text')}${T('notes')}</h2><textarea class="notes" rows="10" placeholder="${T('notesPh')}">${esc(s.notes)}</textarea>`;
  const ta = body.querySelector('textarea');
  ta.oninput = () => { s.notes = ta.value; touch(s); };
}

// ---------- summary ----------
async function renderSummary(s, body) {
  const e = calcEstimate(s.answers, rates);
  const miss = forgotten(s.answers);
  const tax = Math.round(e.high * e.taxRate / 100);
  body.innerHTML = `<div class="sum-grid"><div>
    <div class="price-hero">
      <small>${T('estimate')}</small>
      <div class="range">${e.total ? `${money(e.low)} – ${money(e.high)}` : '—'}</div>
      ${e.total ? `<small>${T('plusTax')} ${e.taxRate}% (${L('up to')} ${money(tax)}) · ${L('point estimate')} ${money(e.total)}</small>` : ''}
      ${e.unknowns.length ? `<div class="hint">${e.unknowns.length} ${T('uncertainNote')}</div>` : ''}
    </div>
    ${e.flags.length ? `<h3 class="h-ic">${ic('alert')}${T('flags')}</h3><ul class="flags">${e.flags.map(f => `<li class="${f.level}">${esc(f.text)}</li>`).join('')}</ul>` : ''}
    <h3 class="h-ic">${ic('help')}${T('forgot')}</h3>
    ${miss.length ? `<ul class="forgot">${miss.map(m => `<li data-go="#/e/${s.id}/${m.sec.id}">${ic(m.sec.icon)}<span class="grow">${esc(L(m.it.label))}${m.unknown ? ` <i>(${L('unknown')})</i>` : ''}</span>${ic('chevron-right', 'chev')}</li>`).join('')}</ul>` : `<p class="ok h-ic">${ic('check-circle')}${T('allAsked')}</p>`}
    </div><div>
    <h3 class="first h-ic">${ic('calculator')}${T('breakdown')}</h3>
    <table class="lines">${e.lines.map(l => `<tr><td>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td>${money(l.amount)}</td></tr>`).join('')}
      <tr class="tot"><td>${T('total')}</td><td>${money(e.total)}</td></tr></table>
    <div class="actions">
      <button class="primary big" data-go="#/e/${s.id}/print">${ic('file-down')}${T('clientPdf')}</button>
      <button class="ghost big" id="share">${ic('send')}${T('shareOffice')}</button>
      <button class="ghost" id="dup">${ic('copy')}${T('duplicate')}</button>
    </div></div></div>`;
  bindGo();
  body.querySelector('#share').onclick = () => shareOffice(s, e);
  body.querySelector('#dup').onclick = () => {
    const id = uid();
    surveys[id] = { ...structuredClone(s), id, owner: session.user, created: Date.now(), updated: Date.now(), photos: [] };
    surveys[id].answers.clientName = T('copyOf') + (s.answers.clientName || '');
    saveSurveys(); go(`#/e/${id}/site`);
  };
}

function officeText(s, e) {
  const a = s.answers, lines = [];
  lines.push(`HighDusting · ${T('appTitle')}`);
  lines.push(`${L('Client')}: ${[a.clientName || '—', a.contactName, a.contactPhone, a.contactEmail].filter(Boolean).join(' · ')}`);
  lines.push(`${L('Address')}: ${a.address?.text || '—'}${a.address?.lat ? ` (https://maps.google.com/?q=${a.address.lat},${a.address.lon})` : ''}`);
  lines.push(`${T('estimate')}: ${money(e.low)} – ${money(e.high)} ${T('plusTax')} ${e.taxRate}%`);
  lines.push('');
  for (const sec of CHECKLIST) {
    const rows = sec.items.filter(it => isAnswered(it, a[it.id])).map(it => `  • ${L(it.label)}: ${fmtAnswer(it, a[it.id])}`);
    if (rows.length) lines.push(L(sec.title).toUpperCase(), ...rows);
  }
  if (e.flags.length) lines.push('', `${T('flags').toUpperCase()}:`, ...e.flags.map(f => '  • ' + f.text));
  const miss = forgotten(a);
  if (miss.length) lines.push('', `${T('forgot').toUpperCase()}:`, ...miss.map(m => '  • ' + L(m.it.label)));
  lines.push('', `${T('breakdown').toUpperCase()}:`, ...e.lines.map(l => `  • ${l.label}: ${money(l.amount)}`));
  if (s.notes) lines.push('', `${T('notes').toUpperCase()}:`, s.notes);
  lines.push('', `${L('Photos')}: ${s.photos.length}`);
  if (estimatorOf(s)) lines.push(`${L('Estimator')}: ${estimatorOf(s)}`);
  return lines.join('\n');
}

function fmtAnswer(it, v) {
  if (it.type === 'qty') return v.on ? (it.unit === 'area' ? L('yes') : `${v.qty} ${Array.isArray(it.unit) ? L(it.unit) : it.unit}`) : L('no');
  if (it.type === 'yn') return L(YN.find(o => o.v === v).l);
  if (it.type === 'select') return L((it.options.find(o => o.v === v) || { l: [v, v] }).l);
  if (it.type === 'multi') return v.map(x => L((it.options.find(o => o.v === x) || { l: [x, x] }).l)).join(', ');
  if (it.type === 'address') return v.text;
  if (it.type === 'number') return `${v} ${it.unit ? (Array.isArray(it.unit) ? L(it.unit) : it.unit) : ''}`.trim();
  return v;
}

async function shareOffice(s, e) {
  const text = officeText(s, e);
  const files = [];
  if (navigator.canShare) {
    for (const p of s.photos.slice(0, 10)) {
      const b = await photoGet(p.id);
      if (b) files.push(new File([b], `${p.prompt}-${p.id}.jpg`, { type: 'image/jpeg' }));
    }
  }
  const data = { title: surveyTitle(s), text };
  if (files.length && navigator.canShare({ files })) data.files = files;
  if (navigator.share) { try { await navigator.share(data); return; } catch (err) { if (err.name === 'AbortError') return; } }
  await navigator.clipboard.writeText(text); toast(T('copied'));
}

// ---------- client print view (always English) ----------
async function renderPrint(s) {
  const e = calcEstimate(s.answers, rates, 'en');
  const a = s.answers;
  const E = L;
  const scope = [];
  for (const sec of CHECKLIST.filter(c => c.id === 'scope')) for (const it of sec.items) {
    if (it.type === 'qty' && a[it.id]?.on) scope.push(it.unit === 'area' ? `${E(it.label).replace(' (by area)', '')}: ${(parseFloat(a.areaScope) || parseFloat(a.areaTotal) || 0).toLocaleString()} sq ft` : `${E(it.label)}: ${a[it.id].qty} ${Array.isArray(it.unit) ? E(it.unit) : it.unit}`);
  }
  const opt = (id) => { const it = CHECKLIST.flatMap(c => c.items).find(i => i.id === id); return a[id] && it.options ? E((it.options.find(o => o.v === a[id]) || { l: ['', ''] }).l) : ''; };
  const conditions = [
    a.heightMax && `Maximum height: ${a.heightMax} ft`,
    opt('dustLevel') && `Dust level: ${opt('dustLevel')}`,
    opt('liftType') && `Access: ${opt('liftType')}${a.clientLift === 'yes' ? ' (client-supplied)' : ''}`,
    opt('window') && `Work window: ${opt('window')}`,
    opt('protection') && `Protection: ${opt('protection')}`,
    (a.hepa === 'yes' || a.facilityType === 'food') && 'HEPA dust extraction',
    opt('frequency') && `Frequency: ${opt('frequency')}`,
  ].filter(Boolean);
  const stops = e.flags.filter(f => f.level === 'stop');
  const imgs = [];
  for (const p of s.photos.slice(0, 6)) imgs.push(await photoUrl(p.id));
  const today = new Date();
  const valid = new Date(today.getTime() + 30 * 864e5);
  const fmt = (d) => d.toLocaleDateString('en-CA', { dateStyle: 'long' });

  app.innerHTML = `
    <div class="noprint top"><button class="ghost" onclick="history.back()">${ic('chevron-left')}${T('back')}</button>
      <button class="primary" onclick="window.print()">${ic('printer')} PDF</button></div>
    <article class="doc">
      <header><div><h1>${esc(settings.company)}</h1><p>${esc(settings.phone)} · ${esc(settings.email)}</p></div>
        <div class="doc-meta"><b>Preliminary estimate</b><br>${fmt(today)}<br>Valid until ${fmt(valid)}</div></header>
      <section><h4>Prepared for</h4><p><b>${esc(a.clientName || '')}</b><br>${esc(a.contactName || '')}<br>${esc(a.address?.text || '')}</p></section>
      <section class="doc-price"><h4>Estimated price range</h4><div class="range">${money(e.low)} – ${money(e.high)} <small>CAD + applicable taxes (${e.taxRate}%)</small></div></section>
      ${scope.length ? `<section><h4>Scope of work</h4><ul>${scope.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      ${conditions.length ? `<section><h4>Site conditions assumed</h4><ul>${conditions.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
      ${a.exclusions ? `<section><h4>Exclusions</h4><p>${esc(a.exclusions)}</p></section>` : ''}
      ${stops.length ? `<section class="warnbox"><h4>Requires further assessment</h4><ul>${stops.map(f => `<li>${esc(f.text)}</li>`).join('')}</ul></section>` : ''}
      ${imgs.length ? `<section><h4>Site photos</h4><div class="doc-photos">${imgs.map(u => `<img src="${u}" alt="">`).join('')}</div></section>` : ''}
      <section class="fine"><p>This is a preliminary estimate based on an on-site walkthrough. The final quote confirms scope, access equipment, work windows, protection and number of visits. Combustible or hazardous dust is assessed separately before any method is proposed.</p>
      ${estimatorOf(s) ? `<p>Estimator: ${esc(estimatorOf(s))}</p>` : ''}</section>
    </article>`;
}

// ---------- settings ----------
function getPath(o, p) { return p.split('.').reduce((x, k) => x?.[k], o); }
function setPath(o, p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((x, k) => (x[k] ??= {}), o)[last] = v; }

function renderSettings() {
  app.innerHTML = `
    <header class="top"><button class="ghost" data-go="#/">${ic('chevron-left')}${T('back')}</button><div class="top-title">${T('settings')}</div><span></span></header>
    <main class="wrap">
      <div class="item"><label class="lbl">${T('theme')}</label><div class="chips">
        ${[['auto', 'themeAuto'], ['light', 'themeLight'], ['dark', 'themeDark']].map(([v, k]) => `<button class="chip ${(settings.theme || 'auto') === v ? 'on' : ''}" data-theme-set="${v}">${ic({ auto: 'monitor', light: 'sun', dark: 'moon' }[v])}${T(k)}</button>`).join('')}</div></div>
      <div class="item"><label class="lbl">${T('signIn')}</label><div class="row" style="margin:0;align-items:center;justify-content:space-between"><b>${esc(currentUser().name)}</b><button class="ghost" id="outBtn2">${T('signOut')}</button></div></div>
      ${['company', 'phone', 'email'].map(k => `<div class="item"><label class="lbl">${T(k)}</label><input data-set="${k}" value="${esc(settings[k])}"></div>`).join('')}
      <h2>${T('ratesTitle')}</h2><p class="intro">${T('ratesNote')}</p>
      <div class="rates">${Object.entries(RATE_LABELS).map(([k, lab]) => `
        <label class="rate"><span>${L(lab)}</span><input type="number" step="any" inputmode="decimal" data-rate="${k}" value="${getPath(rates, k)}"></label>`).join('')}</div>
      <div class="actions"><button class="ghost" id="reset">${T('resetRates')}</button>
        <button class="ghost" id="export">${T('exportData')}</button></div>
    </main>`;
  bindGo();
  app.querySelector('#outBtn2').onclick = signOut;
  app.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => { setTheme(b.dataset.themeSet); renderSettings(); });
  app.querySelectorAll('[data-set]').forEach(i => i.oninput = () => { settings[i.dataset.set] = i.value; store.set('hd.settings', settings); });
  app.querySelectorAll('[data-rate]').forEach(i => i.oninput = () => {
    const n = parseFloat(i.value); if (!isFinite(n)) return;
    setPath(rates, i.dataset.rate, n);
    const over = store.get('hd.rates', {}); setPath(over, i.dataset.rate, n); store.set('hd.rates', over);
  });
  app.querySelector('#reset').onclick = () => { localStorage.removeItem('hd.rates'); rates = structuredClone(DEFAULT_RATES); renderSettings(); toast(T('saved')); };
  app.querySelector('#export').onclick = () => {
    const blob = new Blob([JSON.stringify({ surveys, rates, settings }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `highdusting-surveys-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  };
}

window.go = go;
route();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

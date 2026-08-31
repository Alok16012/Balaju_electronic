/* CRM store for the QR catalogue: leads, cart activity, favourites and orders,
   all keyed by the customer's phone number so admin can replay a full journey.

   Two backends sit behind one interface:
     - local     (default) localStorage, zero config, works the moment you scan
     - supabase  PostgREST over fetch, enabled by setting VITE_SUPABASE_URL and
                 VITE_SUPABASE_PUBLISHABLE_KEY (see supabase/schema.sql)

   Local is always written first so a tap never waits on the network — important
   when the catalogue is opened from a QR code on patchy mobile data. Remote
   writes go through an outbox that retries on reconnect and on next load. */

const DB_KEY = 'balaji-crm';
const LEAD_KEY = 'balaji-lead';
const OUTBOX_KEY = 'balaji-crm-outbox';
const STATE_KEY = phone => `balaji-state:${phone}`;

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
/* Publishable keys are the current browser-safe key format. The legacy anon
   variable remains a fallback so an existing deployment does not break. */
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const remoteEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const backendName = remoteEnabled ? 'supabase' : 'local';

const EMPTY = {leads:[], cart:[], favourites:[], orders:[], visits:[]};
const now = () => new Date().toISOString();
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- phone is the join key across all four tables ---------- */

export function normalisePhone(raw){
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}
export function isValidPhone(raw){
  const p = normalisePhone(raw);
  return p.length === 10 && /^[6-9]/.test(p);
}
export const formatPhone = raw => {
  const p = normalisePhone(raw);
  return p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : raw || '';
};

/* ---------- local persistence ---------- */

function readJson(key, fallback){
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeJson(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
const readDb = () => ({...EMPTY, ...readJson(DB_KEY, EMPTY)});

/* Every mutation goes through here so subscribers refresh exactly once. */
function commit(mutate){
  const db = readDb();
  const result = mutate(db);
  writeJson(DB_KEY, db);
  emit();
  return result;
}

/* ---------- change notification (admin panel live refresh) ---------- */

const listeners = new Set();
const emit = () => listeners.forEach(fn => { try { fn(); } catch {} });

export function subscribe(fn){
  listeners.add(fn);
  const cross = e => { if (e.key === DB_KEY) fn(); };
  addEventListener('storage', cross);
  return () => { listeners.delete(fn); removeEventListener('storage', cross); };
}

/* ---------- supabase transport ---------- */

const ADMIN_KEY = 'balaji-admin-session';

/* Reads run as the signed-in admin when there is a live Supabase session, so
   RLS can keep the four CRM tables closed to the anonymous catalogue key. */
export function adminSession(){
  const s = readJson(ADMIN_KEY, null);
  return s && s.expiresAt > Date.now() ? s : null;
}
export function adminSignOut(){
  try { localStorage.removeItem(ADMIN_KEY); } catch {}
}
export async function adminSignIn({email, password}){
  if (!remoteEnabled) throw new Error('Supabase is not configured');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {apikey: SUPABASE_KEY, 'Content-Type': 'application/json'},
    body: JSON.stringify({email, password}),
  });
  if (!res.ok) throw new Error('Invalid email or password');
  const session = await res.json();
  writeJson(ADMIN_KEY, {
    email,
    token: session.access_token,
    expiresAt: Date.now() + ((session.expires_in || 3600) * 1000),
  });
  return session;
}

async function rest(table, {method = 'GET', body, query = '', prefer} = {}){
  const session = adminSession();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session ? session.token : SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? {Prefer: prefer} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok){
    const detail = await res.json().catch(() => null);
    const error = new Error(`${table} ${method} failed (${res.status})`);
    error.status = res.status;
    /* PostgREST returns the Postgres SQLSTATE here. The outbox needs it to tell
       "already stored" apart from "parent row has not landed yet". */
    error.code = detail && detail.code;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

/* Queue a remote write, try immediately, keep it for retry if the network is
   down. The local copy has already been written, so a failure here is invisible
   to the customer and self-heals on the next load or `online` event. */
function push(table, body, prefer){
  if (!remoteEnabled) return;
  const outbox = readJson(OUTBOX_KEY, []);
  outbox.push({id: uid(), table, body, prefer});
  writeJson(OUTBOX_KEY, outbox.slice(-500));
  flush();
}

let flushing = false;
export async function flush(){
  if (!remoteEnabled || flushing || !navigator.onLine) return;
  const queue = readJson(OUTBOX_KEY, []);
  if (!queue.length) return;
  flushing = true;
  const done = new Set();
  for (const item of queue){
    try {
      await rest(item.table, {method:'POST', body:item.body, prefer:item.prefer});
      done.add(item.id);
    }
    /* 23505 (unique violation) means the row is already stored, so the write is
       complete. Everything else stays queued — in particular 23503, a foreign
       key error raised when the customer's lead row has not been accepted yet;
       dropping those would lose the cart and order events behind it. */
    catch (error) { if (error.code === '23505') done.add(item.id); }
  }
  /* Re-read rather than writing `queue` back: a tap during the awaits above
     appends to the same outbox, and saving a stale snapshot would erase it. */
  const pending = readJson(OUTBOX_KEY, []);
  writeJson(OUTBOX_KEY, pending.filter(item => !done.has(item.id)));
  flushing = false;
  /* Anything queued while we were busy never got its attempt. Retryable
     failures are deliberately not re-run here, so this cannot spin. */
  const attempted = new Set(queue.map(item => item.id));
  if (pending.some(item => !attempted.has(item.id))) flush();
}
if (remoteEnabled) addEventListener('online', flush);

export const pendingWrites = () => readJson(OUTBOX_KEY, []).length;

/* ---------- live sync ----------

   subscribe() above only hears about writes made by this browser. A customer
   scanning the QR code on their own phone touches Supabase and nothing else, so
   the panel would sit on stale numbers until somebody pressed Refresh. Poll a
   cheap signature instead of refetching the tables: the stamp on the newest row
   of each, which moves on an insert and on a repeat scan bumping last_seen.
   Only the reload that follows an actual change costs anything.

   A deletion made straight in the Supabase dashboard does not move any of these
   stamps, so it lands on the next manual Refresh rather than by itself. */

const PULSE = [
  ['leads', 'last_seen'], ['cart_events', 'occurred_at'],
  ['favourite_events', 'occurred_at'], ['orders', 'placed_at'],
  ['visits', 'occurred_at'],
];

async function remotePulse(){
  const rows = await Promise.all(PULSE.map(([table, stamp]) =>
    rest(table, {query: `?select=${stamp}&order=${stamp}.desc&limit=1`})));
  return rows.map((r, i) => (r && r[0] ? r[0][PULSE[i][1]] : '-')).join('|');
}

/* Runs while the admin panel is open. Polling stops on a hidden tab and resumes
   on focus, so a shop screen left open all day does not spend the project's
   request quota watching an empty catalogue. */
export function startLiveSync({interval = 20000} = {}){
  if (!remoteEnabled) return () => {};
  let stopped = false, busy = false, last = null;

  const tick = async () => {
    if (stopped || busy || document.hidden || !navigator.onLine || !adminSession()) return;
    busy = true;
    try {
      const pulse = await remotePulse();
      /* The first tick only records a baseline: the panel has just loaded. */
      if (last !== null && pulse !== last) emit();
      last = pulse;
    }
    catch { /* signed out, offline or rate limited — the next tick retries */ }
    finally { busy = false; }
  };

  const wake = () => { if (!document.hidden) tick(); };
  const timer = setInterval(tick, interval);
  addEventListener('visibilitychange', wake);
  addEventListener('online', wake);
  tick();

  return () => {
    stopped = true;
    clearInterval(timer);
    removeEventListener('visibilitychange', wake);
    removeEventListener('online', wake);
  };
}

/* ---------- current session lead ---------- */

export const getLead = () => readJson(LEAD_KEY, null);
export function clearLead(){
  try { localStorage.removeItem(LEAD_KEY); } catch {}
}

/* Records a scan. Returning customers keep their original lead id and get their
   visit count bumped, so the admin Leads table shows repeat scanners. */
export function identify({name, phone, source}){
  const key = normalisePhone(phone);
  const at = now();
  const lead = commit(db => {
    const existing = db.leads.find(l => l.phone === key);
    if (existing){
      existing.name = name || existing.name;
      existing.lastSeen = at;
      existing.visits = (existing.visits || 1) + 1;
      if (source) existing.source = source;
      return existing;
    }
    const created = {
      id: uid(), name, phone: key, source: source || 'direct',
      at, lastSeen: at, visits: 1,
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    };
    db.leads.push(created);
    return created;
  });
  writeJson(LEAD_KEY, {id: lead.id, name: lead.name, phone: lead.phone, at: lead.at});
  /* Goes through capture_lead() rather than an insert on the table: phone is
     the primary key, so a returning scanner would otherwise fail as a duplicate
     and never bump last_seen or visits. The function is idempotent, which also
     makes it safe for the outbox to retry. */
  push('rpc/capture_lead', {
    p_id: lead.id, p_phone: lead.phone, p_name: lead.name, p_source: lead.source,
    p_device: lead.device, p_visits: lead.visits, p_last_seen: at,
  });
  return lead;
}

/* ---------- visits ---------- */

const VISIT_KEY = 'balaji-visitor';

/* Identifies a browser, not a person, so the admin panel can tell one customer
   refreshing a page from ten separate scans. Worth being blunt about the limit:
   a web page cannot discover who a visitor is. Name and number exist only once
   somebody types them into the gate — everything below is the technical
   context of the visit, which is what makes traffic visible before that. */
function visitorId(){
  let id = readJson(VISIT_KEY, null);
  if (!id){ id = uid(); writeJson(VISIT_KEY, id); }
  return id;
}

/* Fires once per page load, whether or not the visitor ever identifies. A scan
   that bounces off the lead gate still reaches the admin panel, which is the
   only way to see how many codes were scanned versus how many converted. */
export function recordVisit({source, product, category, mode} = {}){
  const lead = getLead();
  const row = {
    id: uid(), visitor: visitorId(),
    phone: lead ? lead.phone : null, name: lead ? lead.name : null,
    source: source || 'direct',
    sku: product ? product.sku : null, cat: category || null, mode: mode || 'Retail',
    path: location.pathname + location.search,
    referrer: document.referrer || '',
    device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    agent: navigator.userAgent.slice(0, 300),
    lang: navigator.language || '',
    screen: `${screen.width}x${screen.height}`,
    at: now(),
  };
  commit(db => db.visits.push(row));
  /* No foreign key to leads: most visits have no phone at all, and one that
     does must not wait on the lead row to land before it is durable. */
  push('visits', {
    id: row.id, visitor_id: row.visitor, phone: row.phone, customer_name: row.name,
    source: row.source, sku: row.sku, category: row.cat, mode: row.mode,
    path: row.path, referrer: row.referrer, device: row.device,
    user_agent: row.agent, language: row.lang, screen: row.screen, occurred_at: row.at,
  });
  return row;
}

/* ---------- activity ---------- */

const slim = p => ({
  productId: p.id, sku: p.sku || '', product: p.name, cat: p.cat, price: p.price, img: p.img,
});

export function recordCart({phone, name, product, action = 'add', qty = 1, price}){
  const key = normalisePhone(phone);
  if (!key) return;
  const row = {id: uid(), phone: key, name, ...slim(product), action, qty, price, at: now()};
  commit(db => db.cart.push(row));
  push('cart_events', {
    id: row.id, phone: key, customer_name: name, product_id: row.productId, sku: row.sku,
    product_name: row.product, category: row.cat, price, qty, action, occurred_at: row.at,
  });
}

export function recordFavourite({phone, name, product, action = 'add', price}){
  const key = normalisePhone(phone);
  if (!key) return;
  const row = {id: uid(), phone: key, name, ...slim(product), action, price, at: now()};
  commit(db => db.favourites.push(row));
  push('favourite_events', {
    id: row.id, phone: key, customer_name: name, product_id: row.productId, sku: row.sku,
    product_name: row.product, category: row.cat, price, action, occurred_at: row.at,
  });
}

export function recordOrder({phone, name, items, total, mode, method}){
  const key = normalisePhone(phone);
  if (!key) return null;
  const row = {
    id: uid(),
    ref: `BE-${Date.now().toString().slice(-6)}`,
    phone: key, name, mode, method: method || 'UPI', total, at: now(),
    items: items.map(i => ({...slim(i), qty: i.qty, price: i.linePrice ?? i.price})),
  };
  commit(db => db.orders.push(row));
  push('orders', {
    id: row.id, order_ref: row.ref, phone: key, customer_name: name, mode, method: row.method,
    total, items: row.items, placed_at: row.at,
  });
  return row;
}

/* ---------- cart + favourites tied to the phone number ---------- */

export function saveCustomerState(phone, {cart, saved}){
  const key = normalisePhone(phone);
  if (!key) return;
  const state = {
    cart: cart.map(i => ({id: i.id, qty: i.qty})),
    saved: [...saved],
    updatedAt: now(),
  };
  writeJson(STATE_KEY(key), state);
  push('customer_state', {phone: key, cart: state.cart, saved: state.saved, updated_at: state.updatedAt}, 'resolution=merge-duplicates');
}

/* Synchronous local read, used at first paint so a returning customer sees
   their basket immediately instead of after a network round trip. */
export function readCustomerState(phone){
  const key = normalisePhone(phone);
  return key ? readJson(STATE_KEY(key), null) : null;
}

/* Reads the phone's basket back. With Supabase configured the remote row wins
   when it is newer, so a customer who scanned on another device sees the same
   cart; otherwise we fall back to whatever this device already holds. */
export async function loadCustomerState(phone){
  const key = normalisePhone(phone);
  if (!key) return null;
  const local = readCustomerState(key);
  if (!remoteEnabled) return local;
  try {
    const rows = await rest('customer_state', {query: `?phone=eq.${key}&select=*&limit=1`});
    const row = rows && rows[0];
    if (!row) return local;
    const remote = {cart: row.cart || [], saved: row.saved || [], updatedAt: row.updated_at};
    if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)){
      writeJson(STATE_KEY(key), remote);
      return remote;
    }
  } catch { /* offline — local copy is still correct */ }
  return local;
}

/* ---------- admin reads ---------- */

const byNewest = field => (a, b) => new Date(b[field]) - new Date(a[field]);

/* Pulls from Supabase when configured and mirrors the result locally, so the
   admin panel keeps working offline and on a device that has never synced. */
export async function loadAll(){
  if (remoteEnabled){
    try {
      const [leads, cart, favourites, orders, visits] = await Promise.all([
        rest('leads', {query: '?select=*&order=captured_at.desc&limit=1000'}),
        rest('cart_events', {query: '?select=*&order=occurred_at.desc&limit=2000'}),
        rest('favourite_events', {query: '?select=*&order=occurred_at.desc&limit=2000'}),
        rest('orders', {query: '?select=*&order=placed_at.desc&limit=1000'}),
        rest('visits', {query: '?select=*&order=occurred_at.desc&limit=2000'}),
      ]);
      const db = {
        leads: leads.map(r => ({id:r.id, name:r.name, phone:r.phone, source:r.source, at:r.captured_at, lastSeen:r.last_seen, visits:r.visits, device:r.device})),
        cart: cart.map(mapEvent('occurred_at')),
        favourites: favourites.map(mapEvent('occurred_at')),
        orders: orders.map(r => ({id:r.id, ref:r.order_ref, phone:r.phone, name:r.customer_name, mode:r.mode, total:r.total, items:r.items || [], at:r.placed_at})),
        visits: visits.map(r => ({id:r.id, visitor:r.visitor_id, phone:r.phone, name:r.customer_name, source:r.source, sku:r.sku, cat:r.category, mode:r.mode, path:r.path, referrer:r.referrer, device:r.device, agent:r.user_agent, lang:r.language, screen:r.screen, at:r.occurred_at})),
      };
      writeJson(DB_KEY, db);
      return db;
    } catch { /* fall through to the local mirror */ }
  }
  const db = readDb();
  return {
    leads: [...db.leads].sort(byNewest('at')),
    cart: [...db.cart].sort(byNewest('at')),
    favourites: [...db.favourites].sort(byNewest('at')),
    orders: [...db.orders].sort(byNewest('at')),
    visits: [...db.visits].sort(byNewest('at')),
  };
}

const mapEvent = stamp => r => ({
  id: r.id, phone: r.phone, name: r.customer_name, productId: r.product_id, sku: r.sku,
  product: r.product_name, cat: r.category, price: r.price, qty: r.qty, action: r.action, at: r[stamp],
});

/* Favourites are stored as an event log so history survives; the admin list
   wants the current state, which is the newest action per phone + product. */
export function activeFavourites(favourites){
  const latest = new Map();
  [...favourites].sort((a, b) => new Date(a.at) - new Date(b.at))
    .forEach(f => latest.set(`${f.phone}:${f.productId}`, f));
  return [...latest.values()].filter(f => f.action === 'add').sort(byNewest('at'));
}

/* The whole journey for one customer, which is the point of keying on phone. */
export function journeyFor(db, phone){
  const key = normalisePhone(phone);
  const match = rows => rows.filter(r => r.phone === key);
  return {
    lead: db.leads.find(l => l.phone === key) || null,
    cart: match(db.cart),
    favourites: match(db.favourites),
    orders: match(db.orders),
    visits: match(db.visits || []),
  };
}

/* Per-lead counters for the Leads table, computed in one pass instead of
   filtering four arrays per row. */
export function rollup(db){
  const tally = new Map();
  const bump = (phone, field, value = 1) => {
    const row = tally.get(phone) || {cart: 0, favourites: 0, orders: 0, revenue: 0};
    row[field] += value;
    tally.set(phone, row);
  };
  db.cart.forEach(e => e.action === 'add' && bump(e.phone, 'cart'));
  activeFavourites(db.favourites).forEach(e => bump(e.phone, 'favourites'));
  db.orders.forEach(o => { bump(o.phone, 'orders'); bump(o.phone, 'revenue', o.total || 0); });
  return tally;
}

export function toCsv(rows, columns){
  const cell = v => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(c => c.label).join(','), ...rows.map(r => columns.map(c => cell(c.get(r))).join(','))].join('\n');
}

export function downloadCsv(filename, csv){
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

if (remoteEnabled) flush();

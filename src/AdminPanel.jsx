import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Lock, Users, ShoppingBag, Heart, PackageCheck, Search, X, Download, LogOut, RefreshCw, ArrowLeft, CloudOff, Eye} from 'lucide-react';
import {
  loadAll, subscribe, rollup, activeFavourites, journeyFor, formatPhone,
  toCsv, downloadCsv, backendName, remoteEnabled, pendingWrites,
  adminSession, adminSignIn, adminSignOut,
} from './services/dataStore.js';

const PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || 'balaji-admin';
const GUARD_KEY = 'balaji-admin-unlocked';

const money = n => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0}).format(n || 0);
const when = iso => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit'});
};

const SECTIONS = [
  {id:'visitors', label:'Visitors', Icon:Eye},
  {id:'leads', label:'Leads', Icon:Users},
  {id:'cart', label:'Cart activity', Icon:ShoppingBag},
  {id:'favourites', label:'Favourites', Icon:Heart},
  {id:'orders', label:'Orders', Icon:PackageCheck},
];

/* ---------- login ---------- */

function AdminLogin({onUnlock}){
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (remoteEnabled){
      setBusy(true);
      try { await adminSignIn({email: email.trim(), password}); onUnlock(); }
      catch (err){ setError(err.message); }
      finally { setBusy(false); }
      return;
    }
    if (passcode === PASSCODE) onUnlock();
    else setError('That passcode is not recognised');
  };

  return <div className="admin-login">
    <form className="admin-login-card" onSubmit={submit}>
      <span className="admin-login-mark" aria-hidden="true"><Lock/></span>
      <h1>Balaji admin</h1>
      <p>Sign in to view leads, cart activity, favourites and orders.</p>
      {remoteEnabled ? <>
        <label className="lead-field"><span>Email</span>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username" required/>
        </label>
        <label className="lead-field"><span>Password</span>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" required/>
        </label>
      </> : <label className="lead-field"><span>Passcode</span>
        <input value={passcode} onChange={e => setPasscode(e.target.value)} type="password" autoComplete="current-password" autoFocus required/>
      </label>}
      {error && <small className="lead-error" role="alert">{error}</small>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {!remoteEnabled && <small className="admin-login-note">Local mode: this passcode ships in the browser bundle and only hides the panel. Configure Supabase to get a real, server-enforced login.</small>}
    </form>
  </div>;
}

/* ---------- panel ---------- */

export default function AdminPanel({onExit}){
  const [unlocked, setUnlocked] = useState(() => (remoteEnabled ? Boolean(adminSession()) : sessionStorage.getItem(GUARD_KEY) === '1'));
  const [db, setDb] = useState(null);
  const [section, setSection] = useState('leads');
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setDb(await loadAll()); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    refresh();
    return subscribe(refresh);
  }, [unlocked, refresh]);

  if (!unlocked) return <AdminLogin onUnlock={() => { sessionStorage.setItem(GUARD_KEY, '1'); setUnlocked(true); }}/>;
  if (!db) return <div className="admin-panel"><div className="admin-empty">Loading customer data…</div></div>;

  const favourites = activeFavourites(db.favourites);
  const counts = rollup(db);
  const revenue = db.orders.reduce((a, o) => a + (o.total || 0), 0);

  const q = query.trim().toLowerCase();
  const hit = r => !q || `${r.name || ''} ${r.phone || ''} ${r.product || ''} ${r.ref || ''}`.toLowerCase().includes(q);
  /* Most visits have no name or number attached, so the shared predicate would
     match nothing useful here. Search the technical context instead — a SKU or
     a source is how you find the scans of one printed label. */
  const hitVisit = r => !q || `${r.name || ''} ${r.phone || ''} ${r.sku || ''} ${r.source || ''} ${r.cat || ''} ${r.path || ''} ${r.device || ''}`.toLowerCase().includes(q);
  const visits = db.visits || [];
  const visitors = new Set(visits.map(r => r.visitor)).size;
  const rows = {
    visitors: visits.filter(hitVisit),
    leads: db.leads.filter(hit),
    cart: db.cart.filter(hit),
    favourites: favourites.filter(hit),
    orders: db.orders.filter(hit),
  };

  const exports = {
    visitors: () => [rows.visitors, [
      {label:'Date/time', get:r => r.at}, {label:'Source', get:r => r.source}, {label:'SKU scanned', get:r => r.sku},
      {label:'Category', get:r => r.cat}, {label:'Page', get:r => r.path}, {label:'Referrer', get:r => r.referrer},
      {label:'Device', get:r => r.device}, {label:'Screen', get:r => r.screen}, {label:'Language', get:r => r.lang},
      {label:'Name', get:r => r.name}, {label:'Phone', get:r => r.phone},
      {label:'Visitor', get:r => r.visitor}, {label:'User agent', get:r => r.agent},
    ]],
    leads: () => [rows.leads, [
      {label:'Name', get:r => r.name}, {label:'Phone', get:r => r.phone}, {label:'Captured at', get:r => r.at},
      {label:'Source', get:r => r.source}, {label:'Device', get:r => r.device}, {label:'Visits', get:r => r.visits},
    ]],
    cart: () => [rows.cart, [
      {label:'Date/time', get:r => r.at}, {label:'Name', get:r => r.name}, {label:'Phone', get:r => r.phone},
      {label:'Product', get:r => r.product}, {label:'Category', get:r => r.cat}, {label:'Qty', get:r => r.qty},
      {label:'Price', get:r => r.price}, {label:'Action', get:r => r.action},
    ]],
    favourites: () => [rows.favourites, [
      {label:'Date/time', get:r => r.at}, {label:'Name', get:r => r.name}, {label:'Phone', get:r => r.phone},
      {label:'Product', get:r => r.product}, {label:'Category', get:r => r.cat}, {label:'Price', get:r => r.price},
    ]],
    orders: () => [rows.orders, [
      {label:'Date/time', get:r => r.at}, {label:'Order', get:r => r.ref}, {label:'Name', get:r => r.name},
      {label:'Phone', get:r => r.phone}, {label:'Items', get:r => r.items.length}, {label:'Total', get:r => r.total},
      {label:'Mode', get:r => r.mode},
    ]],
  };
  const exportCsv = () => {
    const [data, columns] = exports[section]();
    downloadCsv(`balaji-${section}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data, columns));
  };

  const signOut = () => {
    adminSignOut();
    sessionStorage.removeItem(GUARD_KEY);
    setUnlocked(false);
  };

  const phoneCell = r => <button className="admin-phone" onClick={() => setFocus(r.phone)} title="Open full journey">{formatPhone(r.phone)}</button>;

  /* NB: plain divs, not <header>/<nav>. The storefront stylesheet styles those
     element names bare (position:absolute, z-index:20, backdrop blur), and the
     rules would land on this panel's markup. */
  return <div className="admin-panel">
    <div className="admin-head">
      <div className="admin-title">
        <button className="admin-exit" onClick={onExit} aria-label="Back to catalogue"><ArrowLeft/> <span>Catalogue</span></button>
        <h1>Customer intelligence</h1>
        <span className={'admin-backend ' + backendName}>{backendName === 'supabase' ? 'Supabase' : 'Local device'}</span>
        {remoteEnabled && pendingWrites() > 0 && <span className="admin-backend pending"><CloudOff/> {pendingWrites()} queued</span>}
      </div>
      <div className="admin-head-actions">
        <button onClick={refresh} aria-label="Refresh data" className={loading ? 'spin' : ''}><RefreshCw/> <span>Refresh</span></button>
        <button onClick={exportCsv}><Download/> <span>Export CSV</span></button>
        <button onClick={signOut}><LogOut/> <span>Sign out</span></button>
      </div>
    </div>

    <div className="admin-stats">
      <div><b>{visits.length}</b><span>Page visits · {visitors} device{visitors === 1 ? '' : 's'}</span></div>
      <div><b>{db.leads.length}</b><span>Leads captured</span></div>
      <div><b>{db.cart.filter(e => e.action === 'add').length}</b><span>Cart adds</span></div>
      <div><b>{favourites.length}</b><span>Active favourites</span></div>
      <div><b>{db.orders.length}</b><span>Orders</span></div>
      <div><b>{money(revenue)}</b><span>Order value</span></div>
    </div>

    <div className="admin-toolbar">
      <div className="admin-tabs" role="tablist">
        {SECTIONS.map(({id, label, Icon}) => <button key={id} role="tab" aria-selected={section === id}
          className={section === id ? 'active' : ''} onClick={() => setSection(id)}>
          <Icon/> <span>{label}</span> <i>{rows[id].length}</i>
        </button>)}
      </div>
      <div className="admin-search">
        <Search/>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, phone, product or SKU" aria-label="Search customer records"/>
        {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X/></button>}
      </div>
    </div>

    <div className="admin-table-wrap">
      {section === 'visitors' && <table className="admin-table">
        <thead><tr><th>Date / time</th><th>Source</th><th>Scanned</th><th>Category</th><th>Page</th><th>Device</th><th>Customer</th></tr></thead>
        <tbody>{rows.visitors.map(r => <tr key={r.id}>
          <td data-label="Date / time">{when(r.at)}</td>
          <td data-label="Source"><span className="admin-tag">{r.source}</span></td>
          <td data-label="Scanned">{r.sku || '—'}</td>
          <td data-label="Category">{r.cat || '—'}</td>
          <td data-label="Page" title={r.referrer ? `from ${r.referrer}` : undefined}>{r.path}</td>
          <td data-label="Device">{r.device} · {r.screen}</td>
          {/* Anonymous until somebody types their number at the gate; the browser
              cannot tell us who they are, and nothing here tries to guess. */}
          <td data-label="Customer">{r.phone ? <>{r.name} {phoneCell(r)}</> : <span className="admin-tag">anonymous</span>}</td>
        </tr>)}</tbody>
      </table>}

      {section === 'leads' && <table className="admin-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Date / time</th><th>Source</th><th>Visits</th><th>Cart</th><th>Favs</th><th>Orders</th><th>Value</th></tr></thead>
        <tbody>{rows.leads.map(r => {
          const c = counts.get(r.phone) || {cart:0, favourites:0, orders:0, revenue:0};
          return <tr key={r.id}>
            <td data-label="Name"><b>{r.name}</b></td>
            <td data-label="Phone">{phoneCell(r)}</td>
            <td data-label="Date / time">{when(r.at)}</td>
            <td data-label="Source"><span className="admin-tag">{r.source}</span> {r.device}</td>
            <td data-label="Visits">{r.visits}</td>
            <td data-label="Cart">{c.cart}</td>
            <td data-label="Favs">{c.favourites}</td>
            <td data-label="Orders">{c.orders}</td>
            <td data-label="Value">{money(c.revenue)}</td>
          </tr>;
        })}</tbody>
      </table>}

      {section === 'cart' && <table className="admin-table">
        <thead><tr><th>Date / time</th><th>Customer</th><th>Phone</th><th>Product</th><th>Category</th><th>Qty</th><th>Price</th><th>Action</th></tr></thead>
        <tbody>{rows.cart.map(r => <tr key={r.id}>
          <td data-label="Date / time">{when(r.at)}</td>
          <td data-label="Customer"><b>{r.name}</b></td>
          <td data-label="Phone">{phoneCell(r)}</td>
          <td data-label="Product">{r.product}</td>
          <td data-label="Category">{r.cat}</td>
          <td data-label="Qty">{r.qty}</td>
          <td data-label="Price">{money(r.price)}</td>
          <td data-label="Action"><span className={'admin-tag ' + r.action}>{r.action}</span></td>
        </tr>)}</tbody>
      </table>}

      {section === 'favourites' && <table className="admin-table">
        <thead><tr><th>Date / time</th><th>Customer</th><th>Phone</th><th>Product</th><th>Category</th><th>Price</th></tr></thead>
        <tbody>{rows.favourites.map(r => <tr key={r.id}>
          <td data-label="Date / time">{when(r.at)}</td>
          <td data-label="Customer"><b>{r.name}</b></td>
          <td data-label="Phone">{phoneCell(r)}</td>
          <td data-label="Product">{r.product}</td>
          <td data-label="Category">{r.cat}</td>
          <td data-label="Price">{money(r.price)}</td>
        </tr>)}</tbody>
      </table>}

      {section === 'orders' && <table className="admin-table">
        <thead><tr><th>Date / time</th><th>Order</th><th>Customer</th><th>Phone</th><th>Items</th><th>Mode</th><th>Total</th></tr></thead>
        <tbody>{rows.orders.map(r => <tr key={r.id}>
          <td data-label="Date / time">{when(r.at)}</td>
          <td data-label="Order"><b>{r.ref}</b></td>
          <td data-label="Customer">{r.name}</td>
          <td data-label="Phone">{phoneCell(r)}</td>
          <td data-label="Items">{r.items.map(i => `${i.product} ×${i.qty}`).join(', ')}</td>
          <td data-label="Mode">{r.mode}</td>
          <td data-label="Total"><b>{money(r.total)}</b></td>
        </tr>)}</tbody>
      </table>}

      {!rows[section].length && <div className="admin-empty">
        {query ? `No records match “${query}”.` : 'Nothing here yet — it fills up as customers scan the QR code.'}
      </div>}
    </div>

    {focus && <CustomerJourney db={db} phone={focus} close={() => setFocus(null)}/>}
  </div>;
}

/* Every section is keyed on phone, so one number reconstructs the whole visit. */
function CustomerJourney({db, phone, close}){
  const journey = useMemo(() => journeyFor(db, phone), [db, phone]);
  useEffect(() => {
    const key = e => e.key === 'Escape' && close();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = previous;
      removeEventListener('keydown', key);
    };
  }, [close]);

  const {lead, cart, orders} = journey;
  const favourites = activeFavourites(journey.favourites);

  return <div className="admin-journey" role="dialog" aria-modal="true" aria-label={`Journey for ${formatPhone(phone)}`}>
    <div className="admin-journey-scrim" onClick={close}/>
    <aside className="admin-journey-card">
      <div className="admin-journey-head">
        <div>
          <h2>{lead ? lead.name : 'Unknown customer'}</h2>
          <p>{formatPhone(phone)} · first seen {lead ? when(lead.at) : '—'}</p>
        </div>
        <button className="close" onClick={close} aria-label="Close journey"><X/></button>
      </div>

      <section><h3><Eye/> Visits <i>{journey.visits.length}</i></h3>
        {journey.visits.length ? <ul>{journey.visits.map(r => <li key={r.id}><b>{r.sku || r.path}</b><span>{r.source} · {r.device}</span><time>{when(r.at)}</time></li>)}</ul>
          : <p className="admin-empty-inline">No visits recorded against this number.</p>}
      </section>

      <section><h3><ShoppingBag/> Cart activity <i>{cart.length}</i></h3>
        {cart.length ? <ul>{cart.map(r => <li key={r.id}><b>{r.product}</b><span>{r.action} ×{r.qty} · {money(r.price)}</span><time>{when(r.at)}</time></li>)}</ul>
          : <p className="admin-empty-inline">No cart activity.</p>}
      </section>

      <section><h3><Heart/> Favourites <i>{favourites.length}</i></h3>
        {favourites.length ? <ul>{favourites.map(r => <li key={r.id}><b>{r.product}</b><span>{r.cat} · {money(r.price)}</span><time>{when(r.at)}</time></li>)}</ul>
          : <p className="admin-empty-inline">No favourites yet.</p>}
      </section>

      <section><h3><PackageCheck/> Orders <i>{orders.length}</i></h3>
        {orders.length ? <ul>{orders.map(r => <li key={r.id}><b>{r.ref}</b><span>{r.items.length} items · {money(r.total)}</span><time>{when(r.at)}</time></li>)}</ul>
          : <p className="admin-empty-inline">Not converted yet.</p>}
      </section>
    </aside>
  </div>;
}

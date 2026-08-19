/* Printable product spec sheet -> PDF.

   Deliberately no PDF library: the browser's own print pipeline already writes
   PDF on every platform the shop uses (desktop "Save as PDF", iOS/Android
   share sheet), it renders text as selectable text rather than a bitmap, and it
   keeps ~300 kB out of a bundle that is downloaded over shop-floor mobile data.

   Rendered into a hidden iframe rather than a popup window, because a popup is
   what mobile browsers block when print is triggered from a tap. */

import QRCode from 'qrcode';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
));

/* The sheet takes prices as numbers and formats them here, so it can also work
   out the discount. Handing it pre-formatted rupee strings would leave the
   comparison below running on text. */
const money = n => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(n || 0);

/* Wait for the sheet's own images before printing. Chrome will happily print a
   half-loaded document, which on a spec sheet means a blank product shot. */
const imagesReady = doc => Promise.all(
  [...doc.images].map(img => img.complete
    ? Promise.resolve()
    : new Promise(done => { img.onload = img.onerror = done; }))
);

function sheetHtml({product, mode, price, mrp, link, qr}){
  const specs = (product.specs || []).map(s => `<li>${esc(s)}</li>`).join('');
  const saving = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(product.sku || product.name)} — Balaji Electronic</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin:0; font:12pt/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#0d1b2a; }
  .head { display:flex; justify-content:space-between; align-items:flex-start;
          border-bottom:2px solid #0d1b2a; padding-bottom:10px; margin-bottom:18px; }
  .brand b { font-size:17pt; letter-spacing:-.4px; display:block; }
  .brand small { font-size:8pt; letter-spacing:2.4px; text-transform:uppercase; color:#5b6b7f; }
  .head .meta { text-align:right; font-size:9pt; color:#5b6b7f; }
  .top { display:flex; gap:20px; margin-bottom:18px; }
  .shot { width:44%; border:1px solid #dbe2ea; border-radius:8px; padding:10px; }
  .shot img { width:100%; height:auto; display:block; }
  h1 { font-size:19pt; margin:.1em 0 .25em; line-height:1.25; }
  .cat { font-size:9pt; text-transform:uppercase; letter-spacing:1.6px; color:#5b6b7f; }
  .desc { color:#33475e; margin:.5em 0 1em; }
  .price { font-size:23pt; font-weight:700; }
  .price del { font-size:12pt; font-weight:400; color:#7a8aa0; margin-left:9px; }
  .save { display:inline-block; margin-left:8px; font-size:9pt; font-weight:700;
          color:#0a7d3f; border:1px solid #0a7d3f; border-radius:4px; padding:1px 6px; }
  .tax { font-size:8.5pt; color:#5b6b7f; }
  h2 { font-size:10pt; text-transform:uppercase; letter-spacing:1.6px;
       color:#5b6b7f; border-bottom:1px solid #dbe2ea; padding-bottom:5px; margin:20px 0 9px; }
  ul { margin:0; padding-left:17px; } li { margin-bottom:5px; }
  table { width:100%; border-collapse:collapse; font-size:10.5pt; }
  td { padding:6px 0; border-bottom:1px solid #eef2f6; }
  td:first-child { color:#5b6b7f; width:38%; }
  .foot { display:flex; justify-content:space-between; align-items:flex-end;
          margin-top:24px; border-top:1px solid #dbe2ea; padding-top:12px; }
  .qr { text-align:center; font-size:8pt; color:#5b6b7f; }
  .qr img { width:108px; height:108px; display:block; margin-bottom:4px; }
  .note { font-size:8pt; color:#7a8aa0; max-width:60%; }
</style></head><body>
<div class="head">
  <div class="brand"><b>Balaji Electronic</b><small>Electronics Store · Pune</small></div>
  <div class="meta">Product specification sheet<br>${esc(new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}))}</div>
</div>
<div class="top">
  <div class="shot"><img src="${esc(product.img)}" alt="${esc(product.name)}"></div>
  <div>
    <div class="cat">${esc(product.cat)}</div>
    <h1>${esc(product.name)}</h1>
    <div class="desc">${esc(product.desc)}</div>
    <div class="price">${esc(money(price))}<del>${esc(money(mrp))}</del>${saving ? `<span class="save">${saving}% off</span>` : ''}</div>
    <div class="tax">${esc(mode)} price · inclusive of all taxes</div>
  </div>
</div>
<h2>Key specifications</h2>
<ul>${specs}</ul>
<h2>Product details</h2>
<table>
  <tr><td>SKU</td><td>${esc(product.sku || '—')}</td></tr>
  <tr><td>Category</td><td>${esc(product.cat)}</td></tr>
  <tr><td>Customer rating</td><td>${esc(product.rating)} / 5</td></tr>
  <tr><td>Pricing mode</td><td>${esc(mode)}</td></tr>
  <tr><td>Delivery</td><td>Pune · next day · free delivery</td></tr>
  <tr><td>Warranty</td><td>Genuine manufacturer warranty · GST invoice eligible</td></tr>
</table>
<div class="foot">
  <div class="note">Scan the code to open this product in the Balaji Electronic catalogue,
    check live pricing and add it to your cart.<br><br>
    Proof-of-concept catalogue data. Confirm price and stock in store before purchase.</div>
  <div class="qr"><img src="${esc(qr)}" alt="QR code for ${esc(product.name)}">${esc(product.sku || '')}</div>
</div>
</body></html>`;
}

/* Resolves once the print dialog has been handed the document.
   `price` and `mrp` are numbers in rupees, not formatted strings. */
export async function printSpecSheet({product, mode, price, mrp, link}){
  const qr = await QRCode.toDataURL(link, {
    width: 320, margin: 1, errorCorrectionLevel: 'M',
    color: {dark: '#0d1b2aff', light: '#ffffffff'},
  });

  const frame = document.createElement('iframe');
  /* Off-screen rather than display:none — a hidden frame has no layout in
     Safari, and printing it produces an empty page. */
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(sheetHtml({product, mode, price, mrp, link, qr}));
  doc.close();

  await imagesReady(doc);
  frame.contentWindow.focus();
  frame.contentWindow.print();

  /* The print dialog is modal but not awaitable; give the browser a moment to
     take its snapshot before the frame is torn out from under it. */
  setTimeout(() => frame.remove(), 60000);
}

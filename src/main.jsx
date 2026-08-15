import React, {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {motion, AnimatePresence} from 'framer-motion';
import QRCode from 'qrcode';
import {ErrorBoundary} from './ErrorBoundary.jsx';
import {Search, Heart, ShoppingBag, User, ArrowRight, ChevronLeft, ChevronRight, Headphones, Laptop, Smartphone, Tv, Refrigerator, Wind, Gamepad2, Camera, Router, ShieldCheck, Sparkles, X, MessageCircle, Send, Check, Minus, Plus, QrCode, MapPin, Star, PackageCheck, BadgeIndianRupee, Truck, Menu, SlidersHorizontal, Sun, Moon, TicketPercent, Home, Bot, Copy, Download, Share2, Upload} from 'lucide-react';
import {LeadGate} from './LeadGate.jsx';
import {getLead, identify, readCustomerState, loadCustomerState, saveCustomerState, recordCart, recordFavourite, recordOrder} from './services/dataStore.js';
import './styles.css';

/* Admin is a separate concern and a separate audience — keep it out of the
   catalogue bundle so a QR scan on mobile data never downloads it. */
const AdminPanel = lazy(() => import('./AdminPanel.jsx'));

const featuredProducts = [
 {id:1,name:'NovaBook Air 14',cat:'Laptops',price:54990,old:62990,rating:4.8,img:'/assets/balaji-hero.png',pos:'72% 58%',badge:'Bestseller',desc:'Ultra-light aluminium laptop with all-day battery.',specs:['14-inch 2.5K display','16 GB memory · 512 GB SSD','Up to 17 hours battery']},
 {id:2,name:'SonicArc Studio',cat:'TV & Audio',price:7990,old:9990,rating:4.7,img:'/assets/balaji-hero.png',pos:'72% 17%',badge:'20% off',desc:'Immersive wireless headphones with adaptive isolation.',specs:['40 mm spatial drivers','45-hour battery','Dual-device pairing']},
 {id:3,name:'Pulse Pro Smartwatch',cat:'Smart Living',price:4990,old:6990,rating:4.6,img:'/assets/hero-smart.png',pos:'69% 43%',badge:'New',desc:'A premium everyday watch for health, calls and fitness.',specs:['AMOLED display','GPS and Bluetooth calls','7-day battery']},
 {id:4,name:'Vision QLED 55',cat:'TV & Audio',price:46990,old:57990,rating:4.9,img:'/assets/balaji-hero.png',pos:'83% 63%',badge:'Top rated',desc:'Cinema-grade colour, fluid motion and smart entertainment.',specs:['55-inch 4K QLED','Dolby Vision and Atmos','3-year panel warranty']},
 {id:5,name:'ChefPro Mixer 750W',cat:'Kitchen',price:4290,old:5590,rating:4.5,img:'/assets/hero-kitchen.png',pos:'63% 45%',badge:'Kitchen pick',desc:'Powerful mixer grinder with three durable steel jars.',specs:['750 W copper motor','3 stainless-steel jars','Overload protection']},
 {id:6,name:'VitaPress Cold Juicer',cat:'Kitchen',price:8990,old:10990,rating:4.7,img:'/assets/hero-kitchen.png',pos:'82% 34%',badge:'Fresh launch',desc:'Slow extraction for smoother juice and richer nutrition.',specs:['55 RPM cold press','Wide feeding chute','Reverse clean function']},
 {id:7,name:'AeroCool Inverter AC',cat:'Cooling',price:34990,old:41990,rating:4.7,img:'/assets/hero-cooling.png',pos:'75% 18%',badge:'Free installation',desc:'Fast, efficient cooling designed for Pune summers.',specs:['1.5 ton · 5 star','Convertible cooling','Copper condenser']},
 {id:8,name:'BreezeArc Smart Fan',cat:'Cooling',price:4990,old:6290,rating:4.6,img:'/assets/hero-cooling.png',pos:'50% 31%',badge:'Energy saver',desc:'Silent aerodynamic fan with app and remote control.',specs:['BLDC motor','28 W power use','Voice and remote control']},
 {id:9,name:'ChillTower Air Cooler',cat:'Cooling',price:10990,old:13990,rating:4.4,img:'/assets/hero-cooling.png',pos:'80% 65%',badge:'Summer deal',desc:'High-airflow tower cooler with large water capacity.',specs:['45 L tank','4-way air deflection','Low-water alert']},
 {id:10,name:'BakeCraft Digital Oven',cat:'Kitchen',price:11990,old:14990,rating:4.8,img:'/assets/hero-kitchen.png',pos:'48% 72%',badge:'Bestseller',desc:'Bake, grill and roast with precise digital presets.',specs:['32 L capacity','Convection mode','12 cooking presets']},
 {id:11,name:'FlameSense Induction',cat:'Kitchen',price:3190,old:4490,rating:4.5,img:'/assets/hero-kitchen.png',pos:'72% 78%',badge:'Fast cooking',desc:'Slim induction cooktop with responsive touch controls.',specs:['2000 W heating','7 preset menus','Auto pan detection']},
 {id:12,name:'SecureView Home Cam',cat:'Smart Living',price:2990,old:3990,rating:4.5,img:'/assets/hero-smart.png',pos:'87% 22%',badge:'Smart home',desc:'Clear indoor security with private, intelligent alerts.',specs:['2K video','Night vision','Local and cloud storage']},
];
const catalogPlan=[['Mobiles',32,['5G Smartphone','Feature Phone','Rugged Phone']],['Laptops',34,['Everyday Laptop','Business Laptop','Gaming Laptop','Tablet']],['Computer Components',36,['Desktop PC','Graphics Card','NVMe SSD','DDR5 Memory','Power Supply']],['TV & Audio',50,['4K Smart TV','QLED TV','Soundbar','Wireless Headphones','TWS Earbuds','Bluetooth Speaker']],['Refrigerators',24,['Single Door Refrigerator','Double Door Refrigerator','Side-by-Side Refrigerator']],['Washing Machines',24,['Top Load Washer','Front Load Washer','Semi Automatic Washer']],['Cooling',26,['Inverter Split AC','Air Cooler','Smart Ceiling Fan']],['Kitchen',32,['Mixer Grinder','Cold Press Juicer','Air Fryer','Microwave Oven','Induction Stove','Digital Oven']],['Home Appliances',28,['Vacuum Cleaner','Steam Iron','Water Heater','Water Purifier']],['Cameras',16,['Mirrorless Camera','Action Camera','Camera Lens']],['Gaming',24,['Gaming Console','Controller','Gaming Monitor','Gaming Keyboard']],['Networking',24,['Wi-Fi 6 Router','Mesh Wi-Fi Kit','Gigabit Switch']],['Security',22,['IP Camera','DVR Kit','Video Doorbell','Smart Lock']],['Power & Backup',24,['UPS','Home Inverter','Surge Protector','Power Station']],['Smart Living',20,['Smartwatch','Fitness Band','Smart Display','Smart Bulb']],['Mobile Accessories',32,['Power Bank','USB-C Cable','Fast Charger','Wireless Charger']],['Computer Accessories',28,['Wireless Mouse','Mechanical Keyboard','Webcam','USB-C Hub']],['Electronic Components',24,['Maker Board','Sensor Kit','Soldering Station','Digital Multimeter']]];
const brandNames=['Balaji Select','Astra','VoltEdge','NovaTek','PuneWorks','Orbis','Zenith','Cobalt','PixelArc','IndusTech'];
const priceBases={'Mobiles':6999,'Laptops':18999,'Computer Components':1499,'TV & Audio':799,'Refrigerators':12999,'Washing Machines':8999,'Cooling':3999,'Kitchen':699,'Home Appliances':799,'Cameras':4999,'Gaming':1299,'Networking':699,'Security':899,'Power & Backup':499,'Smart Living':399,'Mobile Accessories':199,'Computer Accessories':299,'Electronic Components':99};
const productArt=(category,sku,index)=>{const hue=(index*47)%360,hue2=(hue+54)%360;const label=category.split(' ').slice(0,2).join(' ');const forms=['M150 68c42 0 76 34 76 76s-34 76-76 76-76-34-76-76 34-76 76-76Z','M72 72h156v118H72zM96 202h108','M92 56h116l24 152H68z','M105 48h90v174h-90z','M62 102h176v96H62z'];const form=forms[index%forms.length];return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 300 300"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="hsl(${hue} 35% 14%)"/><stop offset="1" stop-color="hsl(${hue2} 58% 28%)"/></linearGradient><radialGradient id="g"><stop stop-color="hsl(${hue2} 82% 72%)" stop-opacity=".65"/><stop offset="1" stop-color="hsl(${hue} 70% 28%)" stop-opacity="0"/></radialGradient></defs><rect width="300" height="300" fill="url(#b)"/><circle cx="210" cy="82" r="128" fill="url(#g)"/><circle cx="65" cy="235" r="72" fill="none" stroke="hsl(${hue2} 70% 70%)" stroke-opacity=".24"/><path d="${form}" fill="hsl(${hue2} 15% 88%)" fill-opacity=".92" stroke="white" stroke-opacity=".55" stroke-width="2"/><path d="M38 42h64" stroke="hsl(${hue2} 80% 72%)" stroke-width="3"/><text x="38" y="31" fill="white" font-family="Arial" font-size="9" letter-spacing="2">${label.toUpperCase()}</text><text x="38" y="270" fill="white" font-family="Arial" font-size="11" font-weight="700">${sku}</text><text x="38" y="285" fill="white" opacity=".55" font-family="Arial" font-size="7" letter-spacing="1.5">PROOF OF CONCEPT</text></svg>`)}`};
let catalogIndex=0;
const fullCatalog=catalogPlan.flatMap(([cat,count,types])=>Array.from({length:count},(_,j)=>{catalogIndex++;const type=types[j%types.length],brand=brandNames[(catalogIndex*3+j)%brandNames.length],sku=`BE-${String(catalogIndex).padStart(4,'0')}`,base=priceBases[cat],price=base+(j%8)*750+(catalogIndex%5)*200;return{id:catalogIndex,name:`${brand} ${type} ${1000+catalogIndex}`,cat,price,old:Math.round(price*1.18/10)*10,rating:Number((3.8+(catalogIndex%12)/10).toFixed(1)),img:productArt(cat,sku,catalogIndex),pos:'center',badge:['New','Popular','Pune pick','Value deal'][catalogIndex%4],desc:`Reliable ${type.toLowerCase()} selected for everyday performance.`,specs:['Genuine product warranty','Pune delivery available','GST invoice eligible'],sku}}));
const products=catalogPlan.flatMap(([cat])=>fullCatalog.filter(p=>p.cat===cat).slice(0,3)).slice(0,50).map((p,i)=>({...p,img:`/assets/products/product-${String(i+1).padStart(2,'0')}.jpg`,badge:'40% off'}));
const heroSlides=[
 {img:'/assets/hero-light-tech.png',eyebrow:"Pune's smarter electronics destination",title:<>Future-ready tech.<br/><em>Closer to home.</em></>,copy:'Genuine electronics, expert guidance and transparent pricing—for your home, business and everything you’re building next.',cta:'Explore personal tech',filter:'All'},
 {img:'/assets/hero-light-kitchen.png',eyebrow:'A smarter kitchen begins here',title:<>Create more.<br/><em>Work less.</em></>,copy:'Mix, juice, bake and cook with dependable appliances selected for everyday Indian homes.',cta:'Shop kitchen appliances',filter:'Kitchen'},
 {img:'/assets/hero-light-cooling.png',eyebrow:'Pune summer, handled',title:<>Serious cooling.<br/><em>Lower energy.</em></>,copy:'Compare efficient ACs, fans and coolers—with clear installation and same-day delivery options.',cta:'Shop cooling',filter:'Cooling'},
 {img:'/assets/hero-light-smart.png',eyebrow:'Your day, more connected',title:<>Smart living.<br/><em>Beautifully simple.</em></>,copy:'Wearables and smart-home essentials that work together without making life complicated.',cta:'Shop smart living',filter:'Smart Living'}
];
const categories=[['Mobiles',Smartphone,'32 products'],['Laptops',Laptop,'34 products'],['TV & Audio',Tv,'50 products'],['Kitchen',Refrigerator,'32 products'],['Cooling',Wind,'26 products'],['Smart Living',Gamepad2,'20 products'],['Cameras',Camera,'16 products'],['Networking',Router,'24 products']];
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const salePrice=(p,mode='Retail')=>Math.round(p.price*.6*(mode==='Wholesale'?.84:1));
/* Cart and favourites are stored against the phone number as bare {id,qty}
   rows, so a returning customer's basket is rebuilt from live catalogue data
   rather than a stale price or image captured at add-to-cart time. */
const bootState=()=>{const l=getLead();return l?readCustomerState(l.phone):null};
const hydrateCart=rows=>rows.map(r=>{const p=products.find(x=>x.id===r.id);return p?{...p,qty:r.qty||1}:null}).filter(Boolean);
const scanSource=()=>{const q=new URLSearchParams(location.search);return q.get('src')||q.get('utm_source')||(document.referrer?'link':'direct')};
/* Every code the shop prints, shares or reads encodes this one shape: `p` opens
   a product, `cat`/`q` open a filtered view, `mode` opens wholesale pricing, and
   `src=qr` is what makes the lead land in the admin panel tagged as a scan.
   The base is the deployed site when one is configured, because a code printed
   from a laptop has to resolve on a customer's phone, not on localhost. */
const MODES=['Retail','Wholesale'];
const linkBase=()=>{const site=import.meta.env.VITE_PUBLIC_SITE_URL;try{return site?new URL(site).href.replace(/\/+$/,''):location.origin+location.pathname.replace(/(index\.html)?\/*$/,'')}catch{return location.origin}};
const catalogueLink=({product,category,search,mode}={})=>{const u=new URL(linkBase()||location.origin);u.searchParams.set('src','qr');
 if(product)u.searchParams.set('p',product.sku);else{if(category&&category!=='All')u.searchParams.set('cat',category);if(search)u.searchParams.set('q',search)}
 if(MODES.includes(mode)&&mode!=='Retail')u.searchParams.set('mode',mode);return u.toString()};
const readParams=q=>({product:products.find(p=>p.sku===(q.get('p')||'').trim().toUpperCase())||null,cat:products.some(p=>p.cat===q.get('cat'))?q.get('cat'):'All',q:(q.get('q')||'').slice(0,60),mode:MODES.includes(q.get('mode'))?q.get('mode'):'Retail'});
/* Read once at boot: a scan is the only way into this app that carries state,
   so the query it encodes becomes the opening view the moment the gate clears. */
const boot=readParams(new URLSearchParams(location.search));
/* A scanned code is untrusted input. Our own codes are applied in-app; anything
   else is shown to the customer to open themselves, never followed for them. */
const readScan=raw=>{const text=String(raw||'').trim();if(!text)return{kind:'empty'};
 const hit=products.find(p=>p.sku===text.toUpperCase());if(hit)return{kind:'product',product:hit};
 let u;try{u=new URL(text)}catch{return{kind:'text',text}}
 let base='';try{base=new URL(linkBase()).origin}catch{}
 if(u.origin!==location.origin&&u.origin!==base)return{kind:'foreign',text:u.href};
 return{kind:'view',...readParams(u.searchParams)}};

function App(){
 const [mode,setMode]=useState(boot.mode); const [dockActive,setDockActive]=useState('home'); const [theme,setTheme]=useState(()=>localStorage.getItem('balaji-theme')||'light'); const [lead,setLead]=useState(()=>getLead()); const [saved,setSaved]=useState(()=>new Set(bootState()?.saved||[])); const [cart,setCart]=useState(()=>hydrateCart(bootState()?.cart||[])); const [search,setSearch]=useState(boot.q); const [guide,setGuide]=useState(false); const [qr,setQr]=useState(false); const [qrUrl,setQrUrl]=useState(''); const [qrTab,setQrTab]=useState('share'); const [qrScope,setQrScope]=useState('all'); const [menu,setMenu]=useState(false); const [hero,setHero]=useState(0); const [category,setCategory]=useState(boot.cat); const [selected,setSelected]=useState(boot.product); const [cartOpen,setCartOpen]=useState(false); const [page,setPage]=useState(0); const [savedOnly,setSavedOnly]=useState(false); const [auth,setAuth]=useState(false); const [checkout,setCheckout]=useState(false); const [checkoutStep,setCheckoutStep]=useState(0); const [payment,setPayment]=useState(false); const [order,setOrder]=useState(null); const [toast,setToast]=useState(''); const searchRef=useRef(null);
 /* The code is drawn from whatever the customer is looking at right now, and
    only while the dialog is open — nothing is rendered for a modal nobody
    opened. Modules stay dark-on-white in both themes; an inverted QR is legal
    but half the scanner apps in a shop will refuse it. */
 const qrLink=useMemo(()=>qrScope==='product'&&selected?catalogueLink({product:selected,mode}):qrScope==='view'?catalogueLink({category,search,mode}):catalogueLink({mode}),[qrScope,selected,category,search,mode]);
 useEffect(()=>{if(!qr)return;let live=true;QRCode.toDataURL(qrLink,{width:320,margin:2,errorCorrectionLevel:'M',color:{dark:'#07111fff',light:'#ffffffff'}}).then(u=>{if(live)setQrUrl(u)}).catch(()=>{if(live)setQrUrl('')});return()=>{live=false}},[qr,qrLink]);
 useEffect(()=>{const t=setInterval(()=>setHero(h=>(h+1)%heroSlides.length),6500);return()=>clearInterval(t)},[]);
 useEffect(()=>{const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchRef.current?.focus()}};addEventListener('keydown',key);return()=>removeEventListener('keydown',key)},[]);
 useEffect(()=>setPage(0),[search,category,savedOnly]);
 /* One debounced write per burst of edits, keyed to the phone number, in place
    of two synchronous localStorage writes on every quantity tap. */
 useEffect(()=>{if(!lead)return;const t=setTimeout(()=>saveCustomerState(lead.phone,{cart,saved}),400);return()=>clearTimeout(t)},[cart,saved,lead]);
 /* If the same number has a newer basket on the server (scanned on another
    phone), adopt it — but never clobber work already done on this device. */
 useEffect(()=>{if(!lead)return;let live=true;loadCustomerState(lead.phone).then(s=>{if(!live||!s)return;setSaved(prev=>prev.size?prev:new Set(s.saved||[]));setCart(prev=>prev.length?prev:hydrateCart(s.cart||[]))});return()=>{live=false}},[lead]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('balaji-theme',theme)},[theme]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2200);return()=>clearTimeout(t)},[toast]);
 const shown=useMemo(()=>products.filter(p=>(category==='All'||p.cat===category)&&(!savedOnly||saved.has(p.id))&&(p.name+' '+p.cat+' '+p.sku).toLowerCase().includes(search.toLowerCase())),[search,category,savedOnly,saved]);
 const pageSize=24,pageCount=Math.max(1,Math.ceil(shown.length/pageSize)),pageProducts=shown.slice(page*pageSize,(page+1)*pageSize);
 /* savedRef mirrors `saved` synchronously. Reading React state directly here
    would log two "add" events for a fast double-tap, because both handlers run
    against the same pre-render snapshot. */
 const savedRef=useRef(saved); useEffect(()=>{savedRef.current=saved},[saved]);
 const toggleSaved=id=>{const removing=savedRef.current.has(id),p=products.find(x=>x.id===id);const next=new Set(savedRef.current);removing?next.delete(id):next.add(id);savedRef.current=next;setSaved(next);setToast(removing?'Removed from saved':'Saved for later');if(lead&&p)recordFavourite({phone:lead.phone,name:lead.name,product:p,action:removing?'remove':'add',price:salePrice(p,mode)})};
 const addCart=p=>{setCart(c=>{const x=c.find(i=>i.id===p.id);return x?c.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...c,{...p,qty:1}]});setToast(`${p.name} added to cart`);if(lead)recordCart({phone:lead.phone,name:lead.name,product:p,action:'add',qty:1,price:salePrice(p,mode)})};
 const placeOrder=method=>{if(lead)setOrder(recordOrder({phone:lead.phone,name:lead.name,mode,method,total:cart.reduce((a,p)=>a+salePrice(p,mode)*p.qty,0),items:cart.map(i=>({...i,linePrice:salePrice(i,mode)}))}));setCheckoutStep(2)};
 /* One of our own codes is applied as a view change rather than a page load, so
    scanning from inside the app keeps the cart, the lead and the session. */
 const applyScan=r=>{if(r.kind==='product'){setSelected(r.product);setQr(false);setToast(`Opened ${r.product.name}`);return}
  if(r.kind!=='view')return;
  setCategory(r.cat);setSearch(r.q);setMode(r.mode);setSavedOnly(false);setSelected(r.product);setQr(false);
  setToast(r.product?`Opened ${r.product.name}`:r.cat!=='All'?`Showing ${r.cat}`:'Catalogue opened from QR')};
 const captureLead=async form=>{const restored=readCustomerState(form.phone);setLead(identify(form));setToast(restored&&(restored.cart?.length||restored.saved?.length)?`Welcome back, ${form.name.split(' ')[0]} — your cart is ready`:`Welcome, ${form.name.split(' ')[0]}`)};
 /* The catalogue is not rendered at all until the lead is captured — a scan
    lands on the gate, and nothing behind it is downloadable or scrollable. */
 if(!lead) return <LeadGate onSubmit={captureLead} source={scanSource()}/>;
 return <div className="app">
  <div className="sale-banner"><TicketPercent/><b>Independence Day Sale</b><span>40% off every product</span><button onClick={()=>{navigator.clipboard?.writeText('AZADI40');setToast('Coupon AZADI40 copied')}}>Copy code AZADI40</button></div>
  <header><a className="brand" href="#top"><span className="brand-mark">B</span><span>Balaji<small>Electronic</small></span></a>
   <nav className={menu?'open':''}><a href="#categories">Categories</a><a href="#deals">Today's deals</a><a href="#wholesale">Wholesale</a><a href="#support">Support</a></nav>
   <div className="mode" role="group" aria-label="Shopping mode">{['Retail','Wholesale'].map(m=><button key={m} className={mode===m?'active':''} onClick={()=>setMode(m)}>{m}</button>)}</div>
   <div className="actions"><button aria-label={theme==='light'?'Switch to night mode':'Switch to day mode'} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?<Moon/>:<Sun/>}</button><button aria-label="Saved products" onClick={()=>{setSavedOnly(true);setCategory('All');document.querySelector('#deals')?.scrollIntoView()}}><Heart/><b>{saved.size||''}</b></button><button aria-label="Shopping cart" onClick={()=>setCartOpen(true)}><ShoppingBag/><b>{cart.reduce((a,i)=>a+i.qty,0)||''}</b></button><button className="account" onClick={()=>setAuth(true)}><User/> <span>Sign in</span></button><button className="menu" onClick={()=>setMenu(!menu)} aria-label="Menu"><Menu/></button></div>
  </header>
  <main id="top">
   <section className="hero hero-carousel">
    <motion.div className="hero-glow" animate={{scale:[1,1.08,1],opacity:[.55,.85,.55]}} transition={{duration:7,repeat:Infinity}}/>
    <AnimatePresence mode="wait"><motion.img key={heroSlides[hero].img} className="hero-image" src={heroSlides[hero].img} alt="Featured Balaji Electronic product collection" initial={{opacity:0,scale:1.07}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.025}} transition={{duration:1.05,ease:[.22,1,.36,1]}}/></AnimatePresence>
    <AnimatePresence mode="wait"><motion.div key={hero} className="hero-copy" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-18}} transition={{duration:.65}}><div className="eyebrow"><Sparkles/> {heroSlides[hero].eyebrow}</div>
     <h1>{heroSlides[hero].title}</h1>
     <p>{heroSlides[hero].copy}</p>
     <div className="hero-cta"><button className="primary" onClick={()=>{setCategory(heroSlides[hero].filter);document.querySelector('#deals')?.scrollIntoView()}}>{heroSlides[hero].cta} <ArrowRight/></button><button className="secondary" onClick={()=>setMode(mode==='Retail'?'Wholesale':'Retail')}>Shop as {mode==='Retail'?'a wholesaler':'retail'} </button></div>
     <motion.div className="trust-row" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.7}}><span><ShieldCheck/> Genuine products</span><span><Truck/> Pune-first delivery</span><span><PackageCheck/> Easy support</span></motion.div>
    </motion.div></AnimatePresence>
    <div className="hero-controls"><button aria-label="Previous hero" onClick={()=>setHero(h=>(h-1+heroSlides.length)%heroSlides.length)}><ChevronLeft/></button><div>{heroSlides.map((_,i)=><button key={i} aria-label={`Show hero ${i+1}`} className={i===hero?'active':''} onClick={()=>setHero(i)}/>)}</div><button aria-label="Next hero" onClick={()=>setHero(h=>(h+1)%heroSlides.length)}><ChevronRight/></button></div>
    <div className="hero-bottom"><div className="search"><span className="glass-icon"><Search/></span><input aria-label="Search products" ref={searchRef} value={search} onChange={e=>{setSearch(e.target.value);setSavedOnly(false)}} placeholder="Search 50 curated products by name, category or SKU…"/>{search?<button className="search-clear" onClick={()=>setSearch('')}><X/></button>:<kbd>⌘ K</kbd>}</div><button className="qr-btn" onClick={()=>{setQrScope('all');setQrTab('share');setQr(true)}}><span className="glass-icon dark"><QrCode/></span> QR catalogue</button></div>
   </section>

   <section className="service-rail" aria-label="Balaji service benefits">
    <div><ShieldCheck/><span><b>100% genuine</b><small>Brand-backed warranty</small></span></div>
    <div><Truck/><span><b>Pune-first delivery</b><small>Live PIN-code promise</small></span></div>
    <div><BadgeIndianRupee/><span><b>Clear final pricing</b><small>No surprise checkout fees</small></span></div>
    <div><MessageCircle/><span><b>Human help</b><small>Before and after purchase</small></span></div>
   </section>

   <section className="product-scroll" aria-label="Trending products">
    <div className="scroll-heading"><span>Trending across Pune</span><small>Pause on hover · Select any product</small></div>
    <div className="scroll-window"><div className="scroll-track">{[...products.slice(0,14),...products.slice(0,14)].map((p,i)=><button key={`${p.sku}-${i}`} onClick={()=>setSelected(p)}><img src={p.img} alt={i<14?p.name:''}/><span><small>{p.cat}</small><b>{p.name}</b><strong>{money(salePrice(p))}</strong></span></button>)}</div></div>
   </section>

   <section id="categories" className="section"><div className="section-head"><div><span className="kicker">Shop your way</span><h2>Find it faster</h2></div><a href="#deals">View all categories <ArrowRight/></a></div>
    <div className="categories">{categories.map(([name,Icon,count],i)=><motion.button whileHover={{y:-8}} onClick={()=>{setSavedOnly(false);setCategory(name);document.querySelector('#deals')?.scrollIntoView()}} className={'category '+(category===name?'selected':'')} key={name}><span className="cat-num">0{i+1}</span><Icon/><strong>{name}</strong><small>{count}</small><ArrowRight className="cat-arrow"/></motion.button>)}</div>
   </section>

   <section className="editorial-feature">
    <div className="feature-orb orb-a"/><div className="feature-orb orb-b"/>
    <div className="feature-copy"><span className="kicker">Made for everyday India</span><h2>Powerful prep.<br/><i>Quieter mornings.</i></h2><p>ChefPro combines a copper motor, balanced steel jars and simple controls in one dependable kitchen essential.</p><div className="feature-points"><span><b>750 W</b><small>Copper motor</small></span><span><b>3 jars</b><small>Everyday versatility</small></span><span><b>2 yr</b><small>Motor warranty</small></span></div><button className="ink-button" onClick={()=>setSelected(products.find(p=>p.cat==='Kitchen'))}>Meet ChefPro <ArrowRight/></button></div>
    <motion.div className="feature-product" whileHover={{rotate:-2,scale:1.025}}><img src="/assets/hero-light-kitchen.png" alt="ChefPro mixer grinder with stainless-steel jars"/></motion.div>
    <div className="feature-note"><span>01</span><p>Balanced blades create a smoother grind with less vibration.</p></div>
   </section>

   <section className="shelves" aria-label="Product collections">
    <ProductShelf title="Kitchen essentials" subtitle="Made for everyday Indian cooking" items={products.filter(p=>p.cat==='Kitchen')} open={setSelected} add={addCart}/>
    <ProductShelf title="Beat the Pune heat" subtitle="Efficient cooling, clear installation" items={products.filter(p=>p.cat==='Cooling')} open={setSelected} add={addCart}/>
    <ProductShelf title="Smart living, simply" subtitle="Useful technology without the complexity" items={products.filter(p=>p.cat==='Smart Living')} open={setSelected} add={addCart}/>
   </section>

   <section id="deals" className="section products-section"><div className="section-head"><div><span className="kicker">Complete proof-of-concept inventory</span><h2>{savedOnly?'Your saved products':search?`Results for “${search}”`:category==='All'?'All 50 curated products':category}</h2></div><div className="catalog-actions">{(category!=='All'||savedOnly)&&<button onClick={()=>{setCategory('All');setSavedOnly(false)}}><X/> Clear view</button>}<div className="stock-pill"><span/> {shown.length} products · Page {page+1}/{pageCount}</div></div></div>
    <div className="filter-row"><button className={category==='All'&&!savedOnly?'active':''} onClick={()=>{setCategory('All');setSavedOnly(false)}}>All products</button>{['Kitchen','Cooling','Smart Living','TV & Audio','Laptops'].map(x=><button className={category===x&&!savedOnly?'active':''} onClick={()=>{setCategory(x);setSavedOnly(false)}} key={x}>{x}</button>)}<button className={savedOnly?'active':''} onClick={()=>{setCategory('All');setSavedOnly(true)}}><Heart/> Saved ({saved.size})</button></div>
    <div className="product-grid">{pageProducts.map((p,i)=><Product key={p.id} p={p} i={i} mode={mode} saved={saved.has(p.id)} toggleSaved={toggleSaved} addCart={addCart} open={()=>setSelected(p)}/>)}</div>
    {!shown.length&&<div className="empty"><Search/><h3>No exact match yet</h3><p>Try a category, model name or ask the Site Guide.</p></div>}
    {shown.length>0&&<div className="pagination"><button disabled={page===0} onClick={()=>{setPage(p=>p-1);document.querySelector('#deals')?.scrollIntoView()}}><ChevronLeft/> Previous</button><span>Showing {page*pageSize+1}–{Math.min((page+1)*pageSize,shown.length)} of {shown.length}</span><button disabled={page>=pageCount-1} onClick={()=>{setPage(p=>p+1);document.querySelector('#deals')?.scrollIntoView()}}>Next <ChevronRight/></button></div>}
   </section>

   <BrandTrustRail/>
   <TradeClosingExperience openAccount={()=>{setMode('Wholesale');setAuth(true)}} openGuide={()=>setGuide(true)}/>
  </main>
  <PremiumFooter openGuide={()=>setGuide(true)} openTrade={()=>{setMode('Wholesale');setAuth(true)}}/>
  <button className="guide-fab" aria-label="Open Balaji shopping assistant" onClick={()=>setGuide(true)}><span className="assistant-orb" aria-hidden="true"><Bot/><i/></span><span className="assistant-label"><small>Shopping assistant</small><strong>Ask Balaji</strong></span><ArrowRight className="assistant-arrow"/></button>
  <nav className="mobile-dock" aria-label="Mobile shopping navigation"><a href="#top" aria-label="Home" className={dockActive==='home'?'active':''} onClick={()=>setDockActive('home')}><span className="dock-icon"><Home/></span><span>Home</span></a><button aria-label="Search products" className={dockActive==='search'?'active':''} onClick={()=>{setDockActive('search');searchRef.current?.focus();scrollTo({top:620,behavior:'smooth'})}}><span className="dock-icon"><Search/></span><span>Search</span></button><button aria-label="View Independence Day sale" className={'dock-sale '+(dockActive==='sale'?'active':'')} onClick={()=>{setDockActive('sale');setCategory('All');setSavedOnly(false);document.querySelector('#deals')?.scrollIntoView()}}><span className="dock-icon"><TicketPercent/></span><span>Sale</span><small>40%</small></button><button aria-label="Saved products" className={dockActive==='saved'?'active':''} onClick={()=>{setDockActive('saved');if(!saved.size){setToast('Save a product first');return}setSavedOnly(true);setCategory('All');document.querySelector('#deals')?.scrollIntoView()}}><span className="dock-icon"><Heart/></span><span>Saved</span>{saved.size>0&&<b>{saved.size}</b>}</button><button aria-label="Shopping cart" className={dockActive==='cart'?'active':''} onClick={()=>{setDockActive('cart');setCartOpen(true)}}><span className="dock-icon"><ShoppingBag/></span><span>Cart</span>{cart.length>0&&<b>{cart.reduce((a,i)=>a+i.qty,0)}</b>}</button></nav>
  <AnimatePresence>{toast&&<motion.div className="toast" role="status" aria-live="polite" initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}><Check/>{toast}</motion.div>}</AnimatePresence>
  <AnimatePresence>{guide&&<Guide close={()=>setGuide(false)}/>}</AnimatePresence>
  <AnimatePresence>{selected&&<Modal close={()=>setSelected(null)}><ProductDetail p={selected} mode={mode} add={()=>{addCart(selected);setSelected(null);setCartOpen(true)}} saved={saved.has(selected.id)} toggle={()=>toggleSaved(selected.id)} share={()=>{setQrScope('product');setQrTab('share');setQr(true)}}/></Modal>}</AnimatePresence>
  {/* Declared after the product dialog so a code opened from a product sits on
      top of it, and closing the code returns to the product rather than the grid. */}
  <AnimatePresence>{qr&&<Modal close={()=>setQr(false)}><div className="qr-modal">
   <span className="modal-icon"><QrCode/></span>
   <h2>{qrTab==='share'?'Share this catalogue':'Scan a code'}</h2>
   <div className="qr-tabs" role="tablist" aria-label="QR mode">
    <button role="tab" aria-selected={qrTab==='share'} className={qrTab==='share'?'active':''} onClick={()=>setQrTab('share')}><QrCode/> Show code</button>
    <button role="tab" aria-selected={qrTab==='scan'} className={qrTab==='scan'?'active':''} onClick={()=>setQrTab('scan')}><Camera/> Scan code</button>
   </div>
   {qrTab==='share'
    ?<QrShare link={qrLink} image={qrUrl} scope={qrScope} setScope={setQrScope} product={selected} view={search?`Results for “${search}”`:category==='All'?'This view':category} mode={mode} toast={setToast}/>
    :<QrScan onResult={applyScan}/>}
  </div></Modal>}</AnimatePresence>
  <AnimatePresence>{cartOpen&&<CartDrawer cart={cart} setCart={setCart} close={()=>setCartOpen(false)} mode={mode} checkout={()=>{setCartOpen(false);setCheckoutStep(0);setCheckout(true)}} payment={()=>{setCartOpen(false);setPayment(true)}}/>}</AnimatePresence>
  <AnimatePresence>{auth&&<Modal close={()=>setAuth(false)}><AuthFlow mode={mode} close={()=>setAuth(false)}/></Modal>}</AnimatePresence>
  <AnimatePresence>{checkout&&<Modal close={()=>setCheckout(false)} back={checkoutStep===1?()=>setCheckoutStep(0):null}><CheckoutFlow cart={cart} mode={mode} step={checkoutStep} setStep={setCheckoutStep} place={placeOrder} orderRef={order?.ref} close={()=>{setCheckout(false);setCart([]);setOrder(null)}}/></Modal>}</AnimatePresence>
  <AnimatePresence>{payment&&<Modal close={()=>setPayment(false)}><PaymentLink total={cart.reduce((a,p)=>a+salePrice(p,mode)*p.qty,0)} close={()=>setPayment(false)}/></Modal>}</AnimatePresence>
 </div>
}

function BrandTrustRail(){const names=['Balaji Select','Astra','VoltEdge','NovaTek','PuneWorks','Orbis','Zenith','Cobalt','PixelArc','IndusTech'];return <section className="brand-trust" aria-labelledby="brand-trust-title"><span id="brand-trust-title">Brands our customers shop</span><div tabIndex="0" aria-label="Brands available in the demonstration catalogue">{names.map(name=><b key={name}>{name}</b>)}</div></section>}

function TradeClosingExperience({openAccount,openGuide}){const surface=useRef(null);useEffect(()=>{const el=surface.current;if(!el||matchMedia('(pointer: coarse)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;let frame,x=50,y=50,tx=50,ty=50;const move=e=>{const r=el.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*100;ty=(e.clientY-r.top)/r.height*100;if(!frame)frame=requestAnimationFrame(tick)};const tick=()=>{x+=(tx-x)*.09;y+=(ty-y)*.09;el.style.setProperty('--light-x',`${x}%`);el.style.setProperty('--light-y',`${y}%`);if(Math.abs(tx-x)+Math.abs(ty-y)>.1)frame=requestAnimationFrame(tick);else frame=0};el.addEventListener('pointermove',move);return()=>{el.removeEventListener('pointermove',move);cancelAnimationFrame(frame)}},[]);return <section id="wholesale" className="trade-closing"><motion.div ref={surface} className="trade-surface" initial={{opacity:0,y:22}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{duration:.75,ease:[.22,1,.36,1]}}><div className="trade-narrative"><motion.span className="trade-eyebrow" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}}>Balaji Private Trade</motion.span><motion.h2 initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:.08}}>Wholesale,<br/><em>elevated.</em></motion.h2><motion.p initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{delay:.18}}>Preferential trade pricing, GST-ready quotations and dependable fulfilment—designed around the way your business buys.</motion.p><motion.div className="trade-actions" initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:.28}}><button className="trade-primary" onClick={openAccount}>Open a trade account <ArrowRight/></button><button className="trade-secondary" onClick={openGuide}>Speak to trade desk</button></motion.div></div><TradeOrderInstrument/></motion.div><div className="closing-cta"><span>Built for Pune businesses</span><h3>Ready when your next order is.</h3><button onClick={openAccount}>Begin trade registration <ArrowRight/></button></div></section>}

function TradeOrderInstrument(){return <motion.aside className="trade-instrument" aria-label="Trade order preview" initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.4}} transition={{delay:.22,duration:.7,ease:[.22,1,.36,1]}}><header><span>Trade order</span><small>6 products · 28 units</small></header><div className="trade-amount"><small>Order value</small><strong>₹1,84,240</strong></div><div className="partner-status"><div><span>Partner status</span><strong>Silver</strong></div><div><b>₹15,760</b><small>Saved with trade pricing</small></div><div className="tier-line" aria-label="Current partner tier: Silver"><span className="active">Silver</span><i/><span>Gold</span><i/><span>Platinum</span></div></div><ul><li><Check/> GST-ready invoice</li><li><Truck/> Pune delivery</li><li><ShieldCheck/> Genuine products</li><li><MessageCircle/> Trade support</li></ul></motion.aside>}

function PremiumFooter({openGuide,openTrade}){return <footer id="support" className="premium-footer"><div className="footer-main"><div className="footer-identity"><a className="brand" href="#top"><span className="brand-mark">B</span><span>Balaji<small>Electronic</small></span></a><h3>Technology,<br/>considered.</h3><p>Electronics for homes and businesses across Pune.</p></div><div className="footer-links"><div><b>Shop</b><a href="#deals">Products</a><a href="#categories">Categories</a><a href="#deals">Today’s offers</a></div><div><b>Business</b><button onClick={openTrade}>Trade account</button><a href="#wholesale">Bulk ordering</a><button onClick={openGuide}>Business support</button></div><div><b>Support</b><button onClick={openGuide}>Open Site Guide</button><a href="mailto:support@balajielectronic.in">Email support</a><a href="#top">Back to top</a></div></div><div className="footer-contact"><span>Visit us</span><h4><MapPin/> Pune, Maharashtra</h4><p>Mon–Sat · 10am–8pm</p><a href="mailto:support@balajielectronic.in">support@balajielectronic.in</a></div></div><div className="legal-bar"><span>© 2026 Balaji Electronic</span><span>Demonstration storefront · Product and pricing data is illustrative</span><a className="admin-link" href="#admin">Admin</a></div></footer>}

function ProductShelf({title,subtitle,items,open,add}){const rail=useRef(null);const hero=items[0];return <div className="shelf"><div className="shelf-head"><div><h2>{title}</h2><p>{subtitle}</p></div><div><button aria-label={`Scroll ${title} left`} onClick={()=>rail.current?.scrollBy({left:-720,behavior:'smooth'})}><ChevronLeft/></button><button aria-label={`Scroll ${title} right`} onClick={()=>rail.current?.scrollBy({left:720,behavior:'smooth'})}><ChevronRight/></button></div></div><div className="shelf-composition">{hero&&<motion.button className="shelf-feature" onClick={()=>open(hero)} whileHover={{y:-4}}><img loading="lazy" decoding="async" src={hero.img} alt={hero.name}/><span><small>Independence Day edit · 40% off</small><strong>{hero.name}</strong><b>{money(salePrice(hero))} <ArrowRight/></b></span></motion.button>}<div className="shelf-track" ref={rail}>{items.map(p=><article className="shelf-card" key={p.id}><button className="shelf-image" onClick={()=>open(p)}><img loading="lazy" decoding="async" src={p.img} alt={p.name}/></button><small>{p.cat}</small><button className="shelf-name" onClick={()=>open(p)}>{p.name}</button><div><span><b>{money(salePrice(p))}</b><del>{money(p.price)}</del></span><button aria-label={`Add ${p.name} to cart`} onClick={()=>add(p)}><Plus/></button></div></article>)}</div></div></div>}

function Product({p,i,mode,saved,toggleSaved,addCart,open}){return <motion.article className="product" initial={false}>
 <div className="product-visual photo" onClick={open}><motion.img loading="lazy" decoding="async" src={p.img} alt={p.name} style={{objectPosition:p.pos}} whileHover={{scale:1.07}}/><span className="badge">{p.badge}</span><button className={'heart '+(saved?'saved':'')} onClick={e=>{e.stopPropagation();toggleSaved(p.id)}} aria-label={saved?'Remove bookmark':'Bookmark product'}><Heart/></button><button className="quick" aria-label={`Quick view ${p.name}`}>Quick view</button></div>
 <div className="product-body"><span className="product-cat">{p.cat}</span><h3 onClick={open}>{p.name}</h3><p>{p.desc}</p><div className="rating"><Star/> {p.rating} <span>· 120+ reviews</span></div><div className="price"><strong>{money(salePrice(p,mode))}</strong><del>{money(p.old)}</del></div>{mode==='Wholesale'&&<small className="moq">Trade price · MOQ 5 · GST extra</small>}<button className="add" onClick={()=>addCart(p)}>Add to cart <Plus/></button></div></motion.article>}

/* Two halves of one feature: the shop shows a code, or reads one. Both run off
   the catalogue already in memory — no lookup service and no extra route. */
function QrShare({link,image,scope,setScope,product,view,toast}){
 const [copied,setCopied]=useState(false);
 const copy=async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);setTimeout(()=>setCopied(false),1900)}catch{toast('Copying is blocked in this browser')}};
 const send=()=>navigator.share?.({title:'Balaji Electronic',text:'Browse our live catalogue',url:link}).catch(()=>{});
 return <>
  <div className="qr-scope" role="group" aria-label="What this code opens">
   <button className={scope==='all'?'active':''} onClick={()=>setScope('all')}>Whole catalogue</button>
   <button className={scope==='view'?'active':''} onClick={()=>setScope('view')}>{view}</button>
   {product&&<button className={scope==='product'?'active':''} onClick={()=>setScope('product')}>This product</button>}
  </div>
  <div className="qr-frame">{image?<img src={image} alt={`QR code that opens ${link}`}/>:<span>Drawing code…</span>}</div>
  <p className="qr-link" title={link}>{link}</p>
  <div className="qr-actions">
   <button className="primary" onClick={copy}>{copied?<><Check/> Link copied</>:<><Copy/> Copy link</>}</button>
   {image&&<a className="secondary" href={image} download={`balaji-qr-${scope}.png`}><Download/> PNG</a>}
   {typeof navigator!=='undefined'&&navigator.share&&<button className="secondary" onClick={send}><Share2/> Share</button>}
  </div>
  <small className="qr-note">Scanning opens the lead form first, so every scan arrives in the admin panel against a name and number.</small>
 </>}
function QrScan({onResult}){
 const supported=typeof window!=='undefined'&&'BarcodeDetector' in window;
 const videoRef=useRef(null),streamRef=useRef(null);
 const [live,setLive]=useState(false),[note,setNote]=useState(''),[foreign,setForeign]=useState('');
 const stop=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setLive(false)},[]);
 useEffect(()=>stop,[stop]);
 const handle=raw=>{const r=readScan(raw);
  if(r.kind==='foreign'||r.kind==='text'){setForeign(r.text);return}
  if(r.kind==='empty')return;stop();onResult(r)};
 const start=async()=>{setNote('');setForeign('');
  try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
   streamRef.current=s;setLive(true);const v=videoRef.current;v.srcObject=s;await v.play();
   const detector=new BarcodeDetector({formats:['qr_code']});
   /* Polled rather than run per frame: a shop phone holding a code steady only
      needs a few looks a second, and this keeps the camera off the main thread. */
   const tick=async()=>{if(!streamRef.current)return;
    try{const [hit]=await detector.detect(v);if(hit?.rawValue)return handle(hit.rawValue)}catch{}
    setTimeout(tick,220)};
   tick()}
  catch(e){setNote(e?.name==='NotAllowedError'?'Camera permission was declined — use “Scan an image” instead.':'No camera is available on this device.');stop()}};
 const fromFile=async e=>{const file=e.target.files?.[0];if(!file)return;setNote('');setForeign('');
  try{const bitmap=await createImageBitmap(file);const [hit]=await new BarcodeDetector({formats:['qr_code']}).detect(bitmap);bitmap.close?.();
   hit?.rawValue?handle(hit.rawValue):setNote('No QR code was found in that image.')}
  catch{setNote('That image could not be read.')}
  finally{e.target.value=''}};
 if(!supported)return <div className="qr-scan"><p className="qr-note">This browser cannot decode QR codes. Point your phone camera at the code instead — it opens the same link.</p></div>;
 return <div className="qr-scan">
  <div className={live?'qr-stage live':'qr-stage'}><video ref={videoRef} playsInline muted/>{live?<i aria-hidden="true"/>:<span><Camera/> Camera is off</span>}</div>
  <div className="qr-actions">
   {live?<button className="secondary" onClick={stop}>Stop camera</button>:<button className="primary" onClick={start}><Camera/> Start camera</button>}
   <label className="secondary qr-file"><Upload/> Scan an image<input type="file" accept="image/*" onChange={fromFile}/></label>
  </div>
  {note&&<p className="qr-error" role="alert">{note}</p>}
  {/* Shown, never followed: an unknown code is somebody else's link. */}
  {foreign&&<p className="qr-foreign" role="status">That code points somewhere else. Open it yourself if you trust it:<span>{foreign}</span></p>}
 </div>}
function ProductDetail({p,mode,add,saved,toggle,share}){const price=salePrice(p,mode);return <div className="pdp"><div className="pdp-image"><img src={p.img} alt={p.name} style={{objectPosition:p.pos}}/><span>{p.badge}</span></div><div className="pdp-copy"><small>{p.cat} · SKU BE-{String(p.id).padStart(4,'0')}</small><h2>{p.name}</h2><div className="rating"><Star/> {p.rating} <span>· Verified buyers</span></div><p>{p.desc}</p><ul>{p.specs.map(x=><li key={x}><Check/>{x}</li>)}</ul><div className="pdp-price"><strong>{money(price)}</strong><del>{money(p.old)}</del><span>Inclusive of all taxes</span></div><div className="delivery"><Truck/><div><b>Delivery in Pune</b><small>Tomorrow · Free delivery</small></div></div><div className="pdp-actions"><button className="secondary dark" aria-label="Show QR code for this product" title="Show QR code for this product" onClick={share}><QrCode/></button><button className="secondary dark" onClick={toggle}><Heart fill={saved?'currentColor':'none'}/>{saved?'Saved':'Save'}</button><button className="primary" onClick={add}>Add to cart <ShoppingBag/></button></div></div></div>}

function CartDrawer({cart,setCart,close,mode,checkout,payment}){const [coupon,setCoupon]=useState('');const [couponState,setCouponState]=useState('');const applyCoupon=()=>setCouponState(coupon.trim().toUpperCase()==='AZADI40'?'Sale coupon confirmed':'Use AZADI40');const change=(id,d)=>setCart(c=>c.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+d)}:x).filter(x=>x.qty));const total=cart.reduce((a,p)=>a+salePrice(p,mode)*p.qty,0);return <motion.aside className="cart-drawer" initial={{x:480}} animate={{x:0}} exit={{x:480}}><div className="cart-head"><div><span>Your cart</span><b>{cart.reduce((a,x)=>a+x.qty,0)} items</b></div><button aria-label="Close cart" onClick={close}><X/></button></div><div className="cart-items">{!cart.length&&<div className="cart-empty"><ShoppingBag/><h3>Your cart is ready for something good.</h3><button onClick={close}>Continue shopping</button></div>}{cart.map(p=><div className="cart-item" key={p.id}><div className="cart-thumb"><img src={p.img} alt={p.name} style={{objectPosition:p.pos}} onError={e=>{e.currentTarget.src='/assets/products/product-01.jpg'}}/></div><div><b>{p.name}</b><small>{money(salePrice(p,mode))}</small><div className="qty"><button aria-label={`Remove one ${p.name}`} onClick={()=>change(p.id,-1)}><Minus/></button><span>{p.qty}</span><button aria-label={`Add one ${p.name}`} onClick={()=>change(p.id,1)}><Plus/></button></div></div></div>)}</div>{!!cart.length&&<div className="cart-summary"><div className="coupon-field"><TicketPercent/><input aria-label="Coupon code" value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon code"/><button onClick={applyCoupon}>Apply</button></div>{couponState&&<small className={couponState.startsWith('Sale')?'coupon-ok':''}>{couponState}</small>}<div><span>Independence Day price</span><b>{money(total)}</b></div><small>Delivery and payment options calculated next.</small><button className="primary" onClick={checkout}>Proceed to secure checkout <ArrowRight/></button><button className="payment-link" onClick={payment}>Create a payment link</button></div>}</motion.aside>}

function AuthFlow({mode,close}){const [step,setStep]=useState(0);const [phone,setPhone]=useState('');return <div className="flow"><span className="modal-icon"><User/></span><h2>{mode==='Wholesale'?'Create your business account':'Sign in to Balaji'}</h2>{step===0?<><p>{mode==='Wholesale'?'Verify your mobile to start business onboarding and access protected trade prices.':'Save products, sync your cart and track every order.'}</p><label htmlFor="auth-phone">Mobile number<input id="auth-phone" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile number" inputMode="numeric"/></label><button className="primary" disabled={phone.length!==10} onClick={()=>setStep(1)}>Send demo OTP <ArrowRight/></button></>:<><div className="success-mark"><Check/></div><p>Demo verification complete. Your {mode.toLowerCase()} workspace is ready.</p><button className="primary" onClick={close}>Continue shopping</button></>}</div>}

function CheckoutFlow({cart,mode,step,setStep,place,orderRef,close}){const total=cart.reduce((a,p)=>a+salePrice(p,mode)*p.qty,0);return <div className="flow checkout-flow"><span className="modal-icon"><ShoppingBag/></span><h2>{step===2?'Order confirmed':step===1?'Choose payment':'Secure checkout'}</h2>{step===0?<><label>Delivery PIN code<input defaultValue="411001"/></label><label>Delivery address<textarea defaultValue="Pune, Maharashtra"/></label><div className="checkout-total"><span>Payable total</span><b>{money(total)}</b></div><button className="primary" onClick={()=>setStep(1)}>Continue to payment <ArrowRight/></button></>:step===1?<><div className="payment-options"><button onClick={()=>place('UPI')}>UPI <small>Recommended</small></button><button onClick={()=>place('Card')}>Card <small>Visa · Mastercard</small></button><button onClick={()=>place('Net banking')}>Net banking <small>All major banks</small></button></div></>:<><div className="success-mark"><Check/></div><p>Order {orderRef||'BE-260814'} has been created successfully and is now on your admin dashboard. No actual payment was collected.</p><button className="primary" onClick={close}>Done</button></>}</div>}

function PaymentLink({total,close}){const link=`balaji.demo/pay/BE-${Date.now().toString().slice(-6)}`;return <div className="flow"><span className="modal-icon"><QrCode/></span><h2>Payment link ready</h2><p>Amount locked to {money(total)}. This proof-of-concept link expires in 30 minutes.</p><div className="link-box">{link}</div><button className="primary" onClick={()=>{navigator.clipboard?.writeText(`https://${link}`);close()}}>Copy secure link</button></div>}

function Modal({children,close,back}){useEffect(()=>{const key=e=>e.key==='Escape'&&close();const previous=document.body.style.overflow;document.body.style.overflow='hidden';addEventListener('keydown',key);return()=>{removeEventListener('keydown',key);document.body.style.overflow=previous}},[close]);return <motion.div className="overlay" role="presentation" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={close}><motion.div className="modal" role="dialog" aria-modal="true" initial={{scale:.92,y:24}} animate={{scale:1,y:0}} exit={{scale:.95,y:16}} onMouseDown={e=>e.stopPropagation()}><div className="modal-nav">{back&&<button className="modal-back" aria-label="Go back" onClick={back}><ChevronLeft/><span>Back</span></button>}<button className="close" aria-label="Close dialog" onClick={close}><X/></button></div>{children}</motion.div></motion.div>}
function Guide({close}){const [messages,setMessages]=useState([{role:'bot',text:'Namaskar! I’m your Balaji Site Guide. I can help you find products, explain wholesale buying, or show you around.'}]);const [text,setText]=useState('');const send=(v=text)=>{if(!v.trim())return;setMessages(m=>[...m,{role:'user',text:v},{role:'bot',text:v.toLowerCase().includes('wholesale')?'Switch to Wholesale mode to see trade pricing, MOQ and quote tools. Business verification protects your negotiated rates.':'I can help with that. For this prototype, try searching by product, category or budget from the large search bar.'}]);setText('')};return <motion.aside className="guide" initial={{x:420}} animate={{x:0}} exit={{x:420}}><div className="guide-head"><div><span><Sparkles/></span><div><b>Balaji Site Guide</b><small>Online · AI assistant</small></div></div><button aria-label="Close Site Guide" onClick={close}><X/></button></div><div className="messages">{messages.map((m,i)=><div key={i} className={'message '+m.role}>{m.text}</div>)}<div className="prompts">{['Show today’s deals','How does wholesale work?','Help me choose a TV'].map(x=><button key={x} onClick={()=>send(x)}>{x}</button>)}</div></div><div className="composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask about the site…"/><button aria-label="Send message" onClick={()=>send()}><Send/></button></div></motion.aside>}

/* There is no router in this app, so #admin is the route. It cannot collide
   with the #top / #deals / #support anchors the storefront already uses, and
   the panel is code-split so the catalogue never pays for it. */
function Root(){
 const [admin,setAdmin]=useState(()=>location.hash==='#admin');
 useEffect(()=>{const h=()=>setAdmin(location.hash==='#admin');addEventListener('hashchange',h);return()=>removeEventListener('hashchange',h)},[]);
 useEffect(()=>{if(admin)document.documentElement.dataset.theme=localStorage.getItem('balaji-theme')||'light'},[admin]);
 if(!admin) return <App/>;
 return <Suspense fallback={<div className="admin-panel"><div className="admin-empty">Loading admin…</div></div>}><AdminPanel onExit={()=>{history.replaceState(null,'',location.pathname+location.search);setAdmin(false)}}/></Suspense>;
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><Root/></ErrorBoundary>);

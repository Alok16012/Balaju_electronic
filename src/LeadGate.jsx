import React, {useEffect, useRef, useState} from 'react';
import {motion} from 'framer-motion';
import {ShieldCheck, ArrowRight, Heart, ShoppingBag, QrCode} from 'lucide-react';
import {isValidPhone, normalisePhone} from './services/dataStore.js';

/* Gate shown before the catalogue on a QR scan. Name and phone are both
   required; the catalogue stays behind this until the lead is submitted. */
export function LeadGate({onSubmit, source}){
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    nameRef.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, []);

  const nameError = name.trim().length < 2 ? 'Please enter your full name' : '';
  const phoneError = !normalisePhone(phone) ? 'Please enter your phone number'
    : !isValidPhone(phone) ? 'Enter a valid 10-digit Indian mobile number' : '';
  const invalid = Boolean(nameError || phoneError);

  const submit = async e => {
    e.preventDefault();
    setTouched(true);
    if (invalid || busy) return;
    setBusy(true);
    try { await onSubmit({name: name.trim(), phone: normalisePhone(phone), source}); }
    finally { setBusy(false); }
  };

  return <div className="lead-gate" role="dialog" aria-modal="true" aria-labelledby="lead-gate-title">
    <motion.div className="lead-gate-card" initial={{opacity:0, y:26, scale:.97}} animate={{opacity:1, y:0, scale:1}} transition={{duration:.42, ease:[.16,1,.3,1]}}>
      <span className="lead-gate-mark" aria-hidden="true">B</span>
      <span className="lead-gate-kicker"><QrCode/> {source === 'qr' ? 'Scanned in store' : 'Balaji Electronic catalogue'}</span>
      <h1 id="lead-gate-title">See the full catalogue</h1>
      <p className="lead-gate-copy">Tell us who you are and the complete range unlocks — with live Pune pricing, your saved list and your cart kept ready for next time.</p>

      <form onSubmit={submit} noValidate>
        <label className="lead-field">
          <span>Your name</span>
          <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} onBlur={() => setTouched(true)}
            placeholder="e.g. Anita Deshpande" autoComplete="name" enterKeyHint="next"
            aria-invalid={touched && Boolean(nameError)} aria-describedby={touched && nameError ? 'lead-name-error' : undefined}/>
          {touched && nameError && <small className="lead-error" id="lead-name-error" role="alert">{nameError}</small>}
        </label>

        <label className="lead-field">
          <span>Phone number</span>
          <div className="lead-phone">
            <i aria-hidden="true">+91</i>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => setTouched(true)}
              placeholder="98765 43210" inputMode="numeric" autoComplete="tel-national" enterKeyHint="go"
              aria-label="Phone number" aria-invalid={touched && Boolean(phoneError)} aria-describedby={touched && phoneError ? 'lead-phone-error' : undefined}/>
          </div>
          {touched && phoneError && <small className="lead-error" id="lead-phone-error" role="alert">{phoneError}</small>}
        </label>

        <button className="primary lead-submit" type="submit" disabled={busy}>
          {busy ? 'Unlocking…' : 'Unlock the catalogue'} <ArrowRight/>
        </button>
      </form>

      <ul className="lead-gate-perks">
        <li><ShoppingBag/> Cart saved to your number</li>
        <li><Heart/> Favourites waiting next visit</li>
        <li><ShieldCheck/> Used only to serve your order</li>
      </ul>
    </motion.div>
  </div>;
}

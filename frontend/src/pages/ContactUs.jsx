import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { SHOP } from '../config';
import '../styles/ContactUs.css';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

// The server saves the message, emails the owner, and sends the visitor an automatic thank-you.
export default function ContactUs() {
  const [f, setF] = useState(EMPTY);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try { setOk((await api.post('/contact/', f)).data.detail); setF(EMPTY); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="container kg-page kg-contact">
      <h1>Contact us</h1>
      <div className="row g-5">
        <div className="col-lg-5">
          <p>Questions about an order, a product, or becoming a partner store? Write to us and we will reply by email.</p>
          <p className="kg-hint">{SHOP.address}<br />{SHOP.phone}<br />{SHOP.email}</p>
        </div>
        <div className="col-lg-7">
          <form className="kg-form" onSubmit={submit}>
            <div className="row g-3">
              <div className="col-md-6"><label>Name</label><input className="form-control" required value={f.name} onChange={set('name')} autoComplete="name" /></div>
              <div className="col-md-6"><label>Email</label><input className="form-control" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></div>
              <div className="col-md-6"><label>Phone (optional)</label><input className="form-control" value={f.phone} onChange={set('phone')} autoComplete="tel" /></div>
              <div className="col-md-6"><label>Subject</label><input className="form-control" value={f.subject} onChange={set('subject')} /></div>
              <div className="col-12"><label>Message</label><textarea className="form-control" rows={5} required maxLength={3000} value={f.message} onChange={set('message')} /></div>
            </div>
            {err && <div className="kg-flash is-error" role="alert">{err}</div>}
            {ok && <div className="kg-flash is-ok" role="status">{ok}</div>}
            <button className="kg-btn mt-3" disabled={busy}>{busy ? 'Sending\u2026' : 'Send message'}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

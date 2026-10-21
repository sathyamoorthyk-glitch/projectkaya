import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { STATES } from '../utils/states';
import { SHOP } from '../config';

const EMPTY = { full_name: '', phone: '', line1: '', line2: '', landmark: '', city: '', state_code: '33', pincode: '', is_default: false };

// Used in Checkout and Dashboard. Saves to the database (max 3 per customer, enforced by the server too).
export default function AddressForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState({ ...EMPTY, ...initial, state_code: initial?.state_code || '33' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!/^[6-9]\d{9}$/.test(f.phone)) return setErr('Enter a valid 10-digit mobile number.');
    if (!/^[1-9]\d{5}$/.test(f.pincode)) return setErr('Enter a valid 6-digit pincode.');
    setBusy(true);
    try {
      const r = f.id ? await api.patch(`/users/addresses/${f.id}/`, f) : await api.post('/users/addresses/', f);
      onSaved(r.data);
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <form className="kg-form row g-3" onSubmit={submit} noValidate>
      {err && <div className="col-12"><div className="kg-flash is-error" role="alert">{err}</div></div>}
      <div className="col-md-6"><label>Full Name</label><input className="form-control" required value={f.full_name} onChange={set('full_name')} autoComplete="name" /></div>
      <div className="col-md-6"><label>Mobile Number</label><input className="form-control" required inputMode="numeric" maxLength={10} value={f.phone} onChange={set('phone')} autoComplete="tel-national" /></div>
      <div className="col-12"><label>House No. / Street</label><input className="form-control" required value={f.line1} onChange={set('line1')} autoComplete="address-line1" /></div>
      <div className="col-md-6"><label>Area / locality</label><input className="form-control" value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></div>
      <div className="col-md-6"><label>Landmark (optional)</label><input className="form-control" value={f.landmark} onChange={set('landmark')} /></div>
      <div className="col-md-4"><label>City</label><input className="form-control" required value={f.city} onChange={set('city')} autoComplete="address-level2" /></div>
      <div className="col-md-5"><label>State</label>
        <select className="form-select" value={f.state_code} onChange={set('state_code')}>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select></div>
      <div className="col-md-3"><label>Pincode</label><input className="form-control" required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set('pincode')} autoComplete="postal-code" /></div>
      <div className="col-12">
        <label className="kg-check"><input type="checkbox" checked={f.is_default} onChange={set('is_default')} /> Make this my default address</label>
        <p className="kg-hint">Free delivery within {SHOP.deliveryRadiusKm} km of the store.</p>
      </div>
      <div className="col-12 d-flex gap-2">
        <button className="kg-btn" disabled={busy}>{busy ? 'Saving\u2026' : 'Save address'}</button>
        {onCancel && <button type="button" className="kg-btn is-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

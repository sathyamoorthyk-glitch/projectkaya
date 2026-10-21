import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { downloadPdf, errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AddressForm from '../components/AddressForm';
import { stateName } from '../utils/states';
import { inr } from '../utils/tax';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user, setUser, addresses, loadAddresses } = useAuth();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [form, setForm] = useState(null);            // null | {} (new) | address (edit)
  const [profile, setProfile] = useState({ full_name: user.full_name, phone: user.phone });
  const [note, setNote] = useState({ ok: '', err: '' });

  useEffect(() => { api.get('/orders/').then((r) => setOrders(r.data)).catch(() => setOrders([])); }, []);
  const say = (ok, err = '') => setNote({ ok, err });

  const del = async (a) => {
    if (!window.confirm('Delete this address?')) return;
    try { await api.delete(`/users/addresses/${a.id}/`); await loadAddresses(); say('Address deleted.'); } catch (e) { say('', errMsg(e)); }
  };
  const pdf = async (o, kind) => {
    try { await downloadPdf(`/orders/${o.id}/${kind === 'bill' ? 'bill' : 'packing-list'}/`, `${o.confirmation_no}-${kind}.pdf`); } catch (e) { say('', errMsg(e)); }
  };

  return (
    <section className="container kg-page">
      <h1>My account</h1>
      <p className="kg-hint">{user.full_name} &middot; {user.email} &middot; <Link to="/reset">Change password or email</Link></p>
      <div className="kg-tabs" role="tablist">
        {[['orders', 'Orders'], ['addresses', `Addresses (${addresses.length}/3)`], ['profile', 'Profile']].map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => { setTab(k); say(''); }}>{label}</button>
        ))}
      </div>
      {note.ok && <div className="kg-flash is-ok" role="status">{note.ok}</div>}
      {note.err && <div className="kg-flash is-error" role="alert">{note.err}</div>}

      {tab === 'orders' && (<>
        {orders === null && <p>Loading&hellip;</p>}
        {orders?.length === 0 && <p>No orders yet. <Link to="/products">Start shopping</Link></p>}
        {orders?.map((o) => (
          <article key={o.id} className="kg-group">
            <h3>{o.store_name} <small>{o.confirmation_no}</small></h3>
            <p>{new Date(o.paid_at || o.created_at).toLocaleString('en-IN')} &middot; <span className="kg-badge">{o.status}</span> &middot; <b>{inr(o.total)}</b></p>
            <p className="kg-hint">{o.items.map((i) => `${i.name} (${i.brand}, ${i.pack}) x${i.qty}`).join('; ')}</p>
            {o.has_bill && <div className="d-flex gap-2 flex-wrap">
              <button className="kg-btn is-ghost" onClick={() => pdf(o, 'bill')}>Bill (PDF)</button>
              <button className="kg-btn is-ghost" onClick={() => pdf(o, 'packing')}>Packing list (PDF)</button>
            </div>}
          </article>
        ))}
      </>)}

      {tab === 'addresses' && (<>
        {form ? (
          <AddressForm initial={form.id ? form : undefined} onCancel={() => setForm(null)} onSaved={async () => { await loadAddresses(); setForm(null); say('Address saved.'); }} />
        ) : (<>
          <div className="kg-addr-list">
            {addresses.map((a) => (
              <div key={a.id} className="kg-addr">
                <span><b>{a.full_name}</b> &middot; {a.phone} {a.is_default && <em className="kg-badge">Default</em>}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {stateName(a.state_code)} - {a.pincode}</span>
                <span className="d-flex gap-3"><button className="kg-link" onClick={() => setForm(a)}>Edit</button><button className="kg-link" onClick={() => del(a)}>Delete</button></span>
              </div>
            ))}
          </div>
          {addresses.length < 3
            ? <button className="kg-btn mt-3" onClick={() => setForm({})}>Add address</button>
            : <div className="kg-flash is-warn mt-3" role="status">You can store only 3 addresses. Delete one to add a new address.</div>}
        </>)}
      </>)}

      {tab === 'profile' && (
        <form className="kg-form kg-narrow" onSubmit={async (e) => {
          e.preventDefault();
          try { const r = await api.patch('/users/me/', profile); setUser(r.data); say('Profile updated.'); } catch (x) { say('', errMsg(x)); }
        }}>
          <label>Full name</label><input className="form-control" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          <label>Mobile number</label><input className="form-control" maxLength={10} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          <button className="kg-btn mt-3">Save</button>
        </form>
      )}
    </section>
  );
}

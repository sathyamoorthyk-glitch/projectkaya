import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import AddressForm from '../components/AddressForm';
import StoreGroups, { totals } from '../components/StoreGroups';
import { openRazorpay } from '../utils/razorpayCheckout';
import { stateName } from '../utils/states';
import { inr } from '../utils/tax';
import { SHOP } from '../config';
import '../styles/PaymentSuccess.css';

// Step 1: choose / add address (max 3, saved in the database).  Step 2: confirm everything.  Then pay.
export default function Checkout() {
  const { user, addresses, loadAddresses } = useAuth();
  const { items: cartItems, clear, setDeliveryState } = useCart();
  const loc = useLocation();
  const nav = useNavigate();
  const buyNow = loc.state?.items;
  const items = buyNow || cartItems;

  const [step, setStep] = useState('address');
  const [selId, setSelId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = addresses.find((a) => a.id === selId) || addresses.find((a) => a.is_default) || addresses[0];
  useEffect(() => { if (addresses.length === 0) setAdding(true); }, [addresses.length]);

  if (items.length === 0) return <section className="container kg-page"><h1>Checkout</h1><p>Nothing to check out. <Link to="/products">Browse products</Link></p></section>;

  const t = totals(items, selected?.state_code);

  const pay = async () => {
    setErr(''); setBusy(true);
    let rzOrderId = '';
    try {
      const { data } = await api.post('/orders/checkout/', { address_id: selected.id, items: items.map((l) => ({ variant_id: l.id, qty: l.qty })) });
      rzOrderId = data.razorpay_order_id;
      const resp = await openRazorpay({
        key: data.razorpay_key_id, orderId: rzOrderId, amountPaise: data.amount_paise, name: SHOP.name,
        description: `${data.store_count} order${data.store_count > 1 ? 's' : ''}`,
        prefill: { name: selected.full_name, email: user.email, contact: selected.phone },
      });
      try {
        await api.post('/orders/verify/', { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature });
      } catch { /* payment succeeded; the success page keeps checking, and Razorpay's webhook also confirms it */ }
      if (!buyNow) clear();
      nav(`/payment-success/${rzOrderId}`, { replace: true });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <section className="container kg-page">
      <h1>Checkout</h1>
      <ol className="kg-steps"><li className={step === 'address' ? 'is-on' : 'is-done'}>Delivery address</li><li className={step === 'confirm' ? 'is-on' : ''}>Confirm &amp; pay</li></ol>

      {step === 'address' && (
        <div className="row g-5">
          <div className="col-lg-7">
            {addresses.length > 0 && !adding && (
              <div className="kg-addr-list" role="radiogroup" aria-label="Saved addresses">
                {addresses.map((a) => (
                  <label key={a.id} className={`kg-addr ${selected?.id === a.id ? 'is-on' : ''}`}>
                    <input type="radio" name="addr" checked={selected?.id === a.id} onChange={() => setSelId(a.id)} />
                    <span><b>{a.full_name}</b> &middot; {a.phone}<br />{a.line1}{a.line2 && `, ${a.line2}`}<br />{a.city}, {stateName(a.state_code)} - {a.pincode}</span>
                  </label>
                ))}
              </div>
            )}
            {!adding && (addresses.length < 3
              ? <button className="kg-btn is-ghost mt-3" onClick={() => setAdding(true)}>Add a new address</button>
              : <div className="kg-flash is-warn mt-3" role="status">You can store only 3 addresses. To add a new one, delete an old address in your <Link to="/dashboard">dashboard</Link>.</div>)}
            {adding && <AddressForm onCancel={addresses.length ? () => setAdding(false) : undefined}
              onSaved={async (a) => { await loadAddresses(); setSelId(a.id); setAdding(false); }} />}
          </div>
          <div className="col-lg-5">
            <div className="kg-summary"><p>Order total<b>{inr(t.total)}</b></p>
              <button className="kg-btn w-100" disabled={!selected || adding} onClick={() => { setDeliveryState(selected.state_code); setStep('confirm'); }}>Continue</button></div>
          </div>
        </div>
      )}

      {step === 'confirm' && selected && (
        <div className="row g-5">
          <div className="col-lg-7">
            <h2>Please confirm your details</h2>
            <div className="kg-confirm">
              <p><b>{selected.full_name}</b> &middot; {selected.phone} &middot; {user.email}</p>
              <p>{selected.line1}{selected.line2 && `, ${selected.line2}`}{selected.landmark && `, near ${selected.landmark}`}<br />{selected.city}, {stateName(selected.state_code)} - {selected.pincode}</p>
              <button className="kg-link" onClick={() => setStep('address')}>Change address</button>
            </div>
            <StoreGroups items={items} deliveryState={selected.state_code} />
          </div>
          <div className="col-lg-5">
            <div className="kg-summary">
              <p>Amount to pay<b>{inr(t.total)}</b></p>
              <p className="kg-hint">Includes GST. After payment, the bill and packing list are emailed to you and the store.</p>
              {err && <div className="kg-flash is-error" role="alert">{err}</div>}
              <button className="kg-btn w-100" disabled={busy} onClick={pay}>{busy ? 'Opening payment\u2026' : `Confirm & pay ${inr(t.total)}`}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

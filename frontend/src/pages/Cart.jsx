import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import StoreGroups, { totals } from '../components/StoreGroups';
import { STATES } from '../utils/states';
import { inr } from '../utils/tax';
import '../styles/PaymentSuccess.css';

export default function Cart() {
  const { items, setQty, remove, deliveryState, setDeliveryState } = useCart();
  const nav = useNavigate();
  const t = totals(items, deliveryState);

  if (items.length === 0) {
    return <section className="container kg-page"><h1>Your cart</h1><p>Your cart is empty. <Link to="/products">Browse products</Link></p></section>;
  }
  return (
    <section className="container kg-page">
      <h1>Your cart</h1>
      <div className="kg-toolbar">
        <label>Delivering to
          <select className="form-select form-select-sm" value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)}>
            <option value="">Select your state</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
      </div>
      <StoreGroups items={items} deliveryState={deliveryState} controls={(l) => (
        <span className="kg-qty">
          <button onClick={() => (l.qty > 1 ? setQty(l.id, l.qty - 1) : remove(l.id))} aria-label="Less">&minus;</button>
          <span>{l.qty}</span>
          <button onClick={() => setQty(l.id, l.qty + 1)} aria-label="More">+</button>
          <button className="kg-link" onClick={() => remove(l.id)}>Remove</button>
        </span>
      )} />
      <div className="kg-summary">
        <p>Total (incl. GST)<b>{inr(t.total)}</b></p>
        <p className="kg-hint">Items from different stores are packed and billed separately but paid together.</p>
        <button className="kg-btn" onClick={() => nav('/checkout')}>Proceed to checkout</button>
      </div>
    </section>
  );
}

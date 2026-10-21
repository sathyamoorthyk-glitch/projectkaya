import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { downloadPdf } from '../api/client';
import { inr } from '../utils/tax';
import '../styles/PaymentSuccess.css';

export default function PaymentSuccess() {
  const { rzOrderId } = useParams();
  const [orders, setOrders] = useState([]);
  const [tries, setTries] = useState(0);
  const [pdfErr, setPdfErr] = useState('');

  // The server confirms payment a moment after Razorpay closes, so check a few times.
  useEffect(() => {
    if (orders.length || tries > 8) return;
    const t = setTimeout(async () => {
      try { const r = await api.get('/orders/', { params: { razorpay_order_id: rzOrderId } }); setOrders(r.data); } catch { /* retry */ }
      setTries((n) => n + 1);
    }, tries === 0 ? 0 : 2500);
    return () => clearTimeout(t);
  }, [orders.length, tries, rzOrderId]);

  const get = async (o, kind) => {
    setPdfErr('');
    try { await downloadPdf(`/orders/${o.id}/${kind === 'bill' ? 'bill' : 'packing-list'}/`, `${o.confirmation_no}-${kind}.pdf`); }
    catch { setPdfErr('The PDF is still being prepared. Please try again in a moment.'); }
  };

  if (!orders.length) {
    return (
      <section className="container kg-page kg-success">
        <h1>{tries > 8 ? 'We are still confirming your payment' : 'Confirming your payment\u2026'}</h1>
        <p>{tries > 8 ? 'If money was deducted, your order will appear in your dashboard shortly and we will email you.' : 'Please do not close this page.'}</p>
        {tries > 8 && <Link className="kg-btn" to="/dashboard">Go to my orders</Link>}
      </section>
    );
  }
  return (
    <section className="container kg-page kg-success">
      <h1>Payment received. Thank you!</h1>
      <p>Your bill and packing list have been emailed to you and to the store. Payment reference: <b>{orders[0].razorpay_payment_id}</b></p>
      {pdfErr && <div className="kg-flash is-warn">{pdfErr}</div>}
      {orders.map((o) => (
        <article key={o.id} className="kg-group">
          <h3>{o.store_name}</h3>
          <p>Confirmation no: <b>{o.confirmation_no}</b> &middot; {inr(o.total)}</p>
          <ul className="kg-lines">{o.items.map((i) => <li key={i.product_code + i.brand + i.pack}><div><strong>{i.name}</strong><small>{i.brand} &middot; {i.pack} &middot; Qty {i.qty}</small></div><b>{inr(i.line_total)}</b></li>)}</ul>
          <div className="d-flex gap-2 flex-wrap">
            <button className="kg-btn is-ghost" onClick={() => get(o, 'bill')}>Download bill (PDF)</button>
            <button className="kg-btn is-ghost" onClick={() => get(o, 'packing')}>Download packing list (PDF)</button>
          </div>
        </article>
      ))}
      <Link className="kg-btn mt-3" to="/products">Continue shopping</Link>
    </section>
  );
}

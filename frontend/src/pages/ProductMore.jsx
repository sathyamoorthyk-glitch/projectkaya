import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import ProductData from '../components/ProductData';
import { useCart } from '../context/CartContext';
import { STATES } from '../utils/states';
import '../styles/ProductPages.css';

// One page for EVERY category (Rice, Oil, Sugar ...). The slug in the address decides what loads.
export default function ProductMore() {
  const { slug } = useParams();
  const { deliveryState, setDeliveryState } = useCart();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [store, setStore] = useState('');

  useEffect(() => {
    setData(null); setErr('');
    api.get(`/catalog/categories/${slug}/`).then((r) => setData(r.data)).catch((e) => setErr(errMsg(e)));
  }, [slug]);

  const stores = useMemo(() => {
    const m = new Map();
    data?.products.forEach((p) => p.variants.forEach((v) => m.set(v.store, v.store_name)));
    return [...m.entries()];
  }, [data]);

  return (
    <section className="container kg-page">
      <p className="kg-crumb"><Link to="/products">Products</Link> / {data?.category.name}</p>
      <h1>{data?.category.name || 'Loading\u2026'}</h1>
      <div className="kg-toolbar">
        <label>Delivering to
          <select className="form-select form-select-sm" value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)}>
            <option value="">Select your state</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        {stores.length > 1 && (
          <label>Store
            <select className="form-select form-select-sm" value={store} onChange={(e) => setStore(e.target.value)}>
              <option value="">All stores</option>
              {stores.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {err && <div className="kg-flash is-error">{err}</div>}
      <div className="kg-pgrid">
        {data?.products.map((p) => <ProductData key={p.id} product={p} storeFilter={store} />)}
      </div>
      {data && data.products.length === 0 && <p>No products in this category yet.</p>}
    </section>
  );
}

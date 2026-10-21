import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SHOP } from '../config';
import '../styles/Home.css';

export default function Home() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  useEffect(() => { api.get('/catalog/categories/').then((r) => setCats(r.data)).catch(() => {}); }, []);

  return (
    <>
      <section className="kg-hero">
        <div className="container">
          <p className="kg-hero__hello">Welcome back, {user.full_name.split(' ')[0]}.</p>
          <h1>Fresh stock for your kitchen, delivered from the shop you trust.</h1>
          <Link to="/products" className="kg-btn is-light">Browse all products</Link>
        </div>
      </section>

      <section className="container kg-section">
        <h2>Shop by category</h2>
        <ol className="kg-index">
          {cats.map((c) => (
            <li key={c.slug}>
              <Link to={`/category/${c.slug}`}><span>{c.name}</span><em>{c.product_count} {c.product_count === 1 ? 'type' : 'types'}</em></Link>
            </li>
          ))}
          {cats.length === 0 && <li className="kg-index__empty">Products will appear here once the catalog is synced.</li>}
        </ol>
      </section>

      <section className="container kg-section kg-promises">
        <div><h3>Free delivery within {SHOP.deliveryRadiusKm} km</h3><p>Order from the stores closest to you.</p></div>
        <div><h3>Prices include GST</h3><p>Your bill shows CGST + SGST, or IGST for other states, on every item.</p></div>
        <div><h3>Bill in your inbox</h3><p>After payment, the bill and packing list reach you and the store as PDFs.</p></div>
      </section>
    </>
  );
}

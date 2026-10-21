import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import ProductData from '../components/ProductData';
import '../styles/ProductPages.css';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    setRes(null); setErr('');
    api.get('/catalog/search/', { params: { q } }).then((r) => setRes(r.data)).catch((e) => setErr(errMsg(e)));
  }, [q]);

  return (
    <section className="container kg-page">
      <h1>Results for &ldquo;{q}&rdquo;</h1>
      {err && <div className="kg-flash is-error">{err}</div>}
      {!res && !err && <p>Searching&hellip;</p>}
      {res && res.length === 0 && <p>Nothing matched. Try a product, brand or category name.</p>}
      <div className="kg-pgrid">{res?.map((p) => <ProductData key={p.id} product={p} />)}</div>
    </section>
  );
}

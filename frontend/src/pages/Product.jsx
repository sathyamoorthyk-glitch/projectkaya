import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { imgOf, onImgError } from '../utils/tax';
import '../styles/ProductPages.css';

// The category cards: title, image, then the link to that product's page.
export default function Product() {
  const [cats, setCats] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/catalog/categories/').then((r) => setCats(r.data)).catch((e) => setErr(errMsg(e))); }, []);

  return (
    <section className="container kg-page">
      <h1>Products</h1>
      {err && <div className="kg-flash is-error">{err}</div>}
      {!cats && !err && <p>Loading&hellip;</p>}
      <div className="kg-cgrid">
        {cats?.map((c) => (
          <article key={c.slug} className="kg-ccard">
            <h2>{c.name}</h2>
            <img src={imgOf(c.image_url)} alt={c.name} onError={onImgError} loading="lazy" />
            <Link to={`/category/${c.slug}`}>More about {c.name}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

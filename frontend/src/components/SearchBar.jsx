import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { inr } from '../utils/tax';
import '../styles/SearchBar.css';

export default function SearchBar() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const box = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      api.get('/catalog/search/', { params: { q } }).then((r) => { setHits(r.data.slice(0, 6)); setOpen(true); }).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (text) => { setOpen(false); nav(`/search?q=${encodeURIComponent(text)}`); };

  return (
    <div className="kg-search" ref={box}>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q.trim()); }} role="search">
        <i className="bi bi-search" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)}
          placeholder="Search rice, oil, brands" aria-label="Search products" />
      </form>
      {open && hits.length > 0 && (
        <ul className="kg-search__list">
          {hits.map((p) => {
            const from = Math.min(...p.variants.map((v) => Number(v.final_price)));
            return (
              <li key={p.id}>
                <button type="button" onClick={() => go(p.name)}>
                  <span>{p.name}<small>{p.category_name}</small></span>
                  <em>from {inr(from)}</em>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

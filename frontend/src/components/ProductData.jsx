import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { imgOf, inr, onImgError, packLabel, splitTax, taxLabel, toLine } from '../utils/tax';
import { stateName } from '../utils/states';

// One product card: title, image, price (incl. GST), discount, brand + pack-size scrollers, GST/IGST, Add to cart / Buy now.
// The same component renders every product in every category; all data comes from the database.
export default function ProductData({ product, storeFilter = '' }) {
  const nav = useNavigate();
  const { add, deliveryState } = useCart();
  const [brandSel, setBrandSel] = useState('');
  const [sizeSel, setSizeSel] = useState('');
  const [offerSel, setOfferSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const variants = useMemo(() => product.variants.filter((v) => !storeFilter || v.store === storeFilter), [product, storeFilter]);
  const brands = useMemo(() => [...new Set(variants.map((v) => v.brand))], [variants]);
  const brand = brands.includes(brandSel) ? brandSel : brands[0];
  const sizes = useMemo(() => {
    const m = new Map();
    variants.filter((v) => v.brand === brand).forEach((v) => {
      const key = `${Number(v.pack_size)}${v.unit}`;
      if (!m.has(key)) m.set(key, { key, size: Number(v.pack_size), unit: v.unit });
    });
    return [...m.values()].sort((a, b) => a.unit.localeCompare(b.unit) || a.size - b.size);   // smallest (0.25 kg) first
  }, [variants, brand]);
  const size = sizes.find((s) => s.key === sizeSel) || sizes[0];
  const offers = useMemo(
    () => variants.filter((v) => v.brand === brand && size && `${Number(v.pack_size)}${v.unit}` === size.key)
      .sort((a, b) => Number(a.final_price) - Number(b.final_price)),
    [variants, brand, size]);
  const offer = offers.find((o) => o.id === offerSel) || offers[0];
  if (!offer) return null;

  const price = Number(offer.price), final = Number(offer.final_price);
  const tax = splitTax(final, product.gst_rate, offer.store_state, deliveryState);
  const out = offer.stock <= 0;
  const line = toLine(product, offer);

  return (
    <article className="kg-pcard">
      <div className="kg-pcard__media"><img src={imgOf(product.image_url)} alt={product.name} onError={onImgError} loading="lazy" /></div>
      <div className="kg-pcard__body">
        <h3>{product.name}</h3>
        <p className="kg-pcard__id">Product ID {product.code}{product.hsn_code && ` \u00b7 HSN ${product.hsn_code}`}</p>

        <div className="kg-pcard__price">
          <strong>{inr(final)}</strong>
          {offer.discount_percent > 0 && <><s>{inr(price)}</s><span className="kg-badge">{offer.discount_percent}% off</span></>}
        </div>
        <p className="kg-pcard__tax">
          Incl. {taxLabel(tax)} ({inr(tax.tax)})
          {tax.mode === 'unknown' && <> &middot; pick your state in the cart to see CGST/SGST or IGST</>}
          {tax.mode === 'inter' && <> &middot; delivering to {stateName(deliveryState)}</>}
        </p>

        <div className="kg-scroll-label">Brand</div>
        <div className="kg-scroller" role="radiogroup" aria-label="Brand">
          {brands.map((b) => (
            <button key={b} type="button" role="radio" aria-checked={b === brand} className={`kg-chip ${b === brand ? 'is-on' : ''}`}
              onClick={() => { setBrandSel(b); setSizeSel(''); setOfferSel(null); }}>{b}</button>
          ))}
        </div>

        <div className="kg-scroll-label">Pack size</div>
        <div className="kg-scroller" role="radiogroup" aria-label="Pack size">
          {sizes.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={s.key === size.key} className={`kg-chip ${s.key === size.key ? 'is-on' : ''}`}
              onClick={() => { setSizeSel(s.key); setOfferSel(null); }}>{packLabel(s.size, s.unit)}</button>
          ))}
        </div>

        {offers.length > 1 ? (
          <label className="kg-sold">Sold by
            <select className="form-select form-select-sm" value={offer.id} onChange={(e) => setOfferSel(Number(e.target.value))}>
              {offers.map((o) => <option key={o.id} value={o.id}>{o.store_name} - {inr(o.final_price)}</option>)}
            </select>
          </label>
        ) : <p className="kg-sold">Sold by {offer.store_name}</p>}

        {out ? <p className="kg-stock is-out">Out of stock</p> : offer.stock <= 5 && <p className="kg-stock">Only {offer.stock} left</p>}

        <div className="kg-pcard__buy">
          <div className="kg-qty" aria-label="Quantity">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Less">&minus;</button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(Math.min(qty + 1, offer.stock || 1, 50))} aria-label="More">+</button>
          </div>
          <button className="kg-btn is-ghost" disabled={out} onClick={() => { add(line, qty); setAdded(true); setTimeout(() => setAdded(false), 1500); }}>
            {added ? 'Added' : 'Add to cart'}
          </button>
          <button className="kg-btn" disabled={out} onClick={() => nav('/checkout', { state: { items: [{ ...line, qty }] } })}>Buy now</button>
        </div>
      </div>
    </article>
  );
}

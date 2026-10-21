// Display-only GST maths (the server recalculates everything at checkout). Prices are GST-inclusive.
export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n) || 0);
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const packLabel = (size, unit) => `${Number(size)} ${unit}`;
export const imgOf = (url) => url || '/images/placeholder.svg';
export const onImgError = (e) => { if (!e.target.dataset.fb) { e.target.dataset.fb = '1'; e.target.src = '/images/placeholder.svg'; } };

export function splitTax(total, rate, storeState, customerState) {
  const r = Number(rate);
  const taxable = round2((total * 100) / (100 + r));
  const tax = round2(total - taxable);
  if (!customerState) return { rate: r, taxable, tax, mode: 'unknown', cgst: 0, sgst: 0, igst: 0 };
  if (customerState === storeState) {
    const cgst = round2(tax / 2);
    return { rate: r, taxable, tax, mode: 'intra', cgst, sgst: round2(tax - cgst), igst: 0 };
  }
  return { rate: r, taxable, tax, mode: 'inter', cgst: 0, sgst: 0, igst: tax };
}

export function taxLabel(t) {
  if (t.mode === 'intra') return `CGST ${t.rate / 2}% + SGST ${t.rate / 2}%`;
  if (t.mode === 'inter') return `IGST ${t.rate}%`;
  return `GST ${t.rate}%`;
}

// product + chosen variant -> the small object kept in the cart
export const toLine = (p, v) => ({
  id: v.id, code: p.code, name: p.name, brand: v.brand, pack: packLabel(v.pack_size, v.unit), image: p.image_url,
  price: Number(v.price), discount: v.discount_percent, unit_price: Number(v.final_price), gst_rate: Number(p.gst_rate),
  hsn: p.hsn_code, store: v.store, store_name: v.store_name, store_state: v.store_state, stock: v.stock,
});

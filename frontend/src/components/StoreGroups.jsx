import { inr, splitTax, taxLabel } from '../utils/tax';

// Lines grouped by store, with the GST/IGST split for the chosen delivery state. Used by Cart and Checkout.
export function groupByStore(items) {
  const g = {};
  items.forEach((i) => { (g[i.store] ||= { name: i.store_name, state: i.store_state, lines: [] }).lines.push(i); });
  return Object.values(g);
}

export function totals(items, deliveryState) {
  let total = 0, cgst = 0, sgst = 0, igst = 0;
  items.forEach((i) => {
    const line = i.unit_price * i.qty;
    const t = splitTax(line, i.gst_rate, i.store_state, deliveryState);
    total += line; cgst += t.cgst; sgst += t.sgst; igst += t.igst;
  });
  return { total, cgst, sgst, igst };
}

export default function StoreGroups({ items, deliveryState, controls }) {
  return groupByStore(items).map((g) => {
    const t = totals(g.lines, deliveryState);
    return (
      <section key={g.name} className="kg-group">
        <h3>{g.name}</h3>
        <ul className="kg-lines">
          {g.lines.map((l) => {
            const tx = splitTax(l.unit_price * l.qty, l.gst_rate, l.store_state, deliveryState);
            return (
              <li key={l.id}>
                <div>
                  <strong>{l.name}</strong>
                  <small>{l.brand} &middot; {l.pack} &middot; ID {l.code}</small>
                  <small>{taxLabel(tx)} included ({inr(tx.tax)})</small>
                </div>
                <div className="kg-lines__right">
                  {controls ? controls(l) : <span>Qty {l.qty}</span>}
                  <b>{inr(l.unit_price * l.qty)}</b>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="kg-group__total">
          {t.igst > 0 ? `IGST ${inr(t.igst)}` : t.cgst > 0 ? `CGST ${inr(t.cgst)} + SGST ${inr(t.sgst)}` : ''}
          <span>Subtotal <b>{inr(t.total)}</b></span>
        </p>
      </section>
    );
  });
}
